const express = require('express')

const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function numero(valor) {
  const convertido = Number(valor)

  if (!Number.isFinite(convertido)) {
    return null
  }

  return convertido
}

function mapItem(r) {
  return {
    id: r.id,
    produtoId: r.produto_id,
    nome: r.nome_produto,
    quantidade: Number(r.quantidade),
    precoUnitario: Number(r.preco_unitario),
    subtotal: Number(r.subtotal),
  }
}

function mapVenda(r, itens = []) {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    usuarioId: r.usuario_id,

    caixaId: r.caixa_id,
    terminal: r.terminal,

    clienteId: r.cliente_id,

    itens,

    subtotal: Number(r.subtotal || 0),
    desconto: Number(r.desconto || 0),
    total: Number(r.total || 0),

    formaPagamento: r.forma_pagamento,

    status: r.status,
    criadaEm: r.criada_em,
    canceladaEm: r.cancelada_em,
    canceladaPor: r.cancelada_por,
  }
}

async function carregarItensVenda(
  executor,
  vendaId,
) {
  const resultado = await executor.query(
    `
    SELECT *
    FROM venda_itens
    WHERE venda_id = $1
    ORDER BY id
    `,
    [vendaId],
  )

  return resultado.rows.map(mapItem)
}

// LISTAR VENDAS
router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM vendas
        WHERE empresa_id = $1
        ORDER BY criada_em DESC, id DESC
        `,
        [req.usuario.empresaId],
      )

      const vendas = []

      for (const row of resultado.rows) {
        const itens =
          await carregarItensVenda(
            pool,
            row.id,
          )

        vendas.push(mapVenda(row, itens))
      }

      return res.status(200).json({
        vendas,
      })
    } catch (erro) {
      console.error(
        'Erro ao listar vendas:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar as vendas.',
      })
    }
  },
)

// REALIZAR VENDA
router.post(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    const client = await pool.connect()

    try {
      const {
        itens,
        clienteId,
        formaPagamento,
        desconto = 0,
        terminal = '001',
      } = req.body

      if (
        !Array.isArray(itens) ||
        itens.length === 0
      ) {
        return res.status(400).json({
          erro: 'A venda precisa possuir pelo menos um item.',
        })
      }

      const terminalNormalizado = String(
        terminal || '001',
      ).trim()

      const pagamento = String(
        formaPagamento || '',
      ).trim()

      const formasPermitidas = [
        'Pix',
        'Dinheiro',
        'Cartão de débito',
        'Cartão de crédito',
      ]

      if (!formasPermitidas.includes(pagamento)) {
        return res.status(400).json({
          erro: 'Forma de pagamento inválida.',
        })
      }

      await client.query('BEGIN')

      // Trava o caixa durante a venda
      const resultadoCaixa =
        await client.query(
          `
          SELECT *
          FROM caixas
          WHERE empresa_id = $1
            AND terminal = $2
            AND status = 'aberto'
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE
          `,
          [
            req.usuario.empresaId,
            terminalNormalizado,
          ],
        )

      if (!resultadoCaixa.rows[0]) {
        await client.query('ROLLBACK')

        return res.status(409).json({
          erro: `O caixa ${terminalNormalizado} não está aberto.`,
        })
      }

      const caixa = resultadoCaixa.rows[0]

      // Valida cliente se informado
      let clienteNormalizado = null
      let clienteClube = false

      if (
        clienteId !== undefined &&
        clienteId !== null &&
        clienteId !== ''
      ) {
        clienteNormalizado =
          Number(clienteId)

        if (
          !Number.isInteger(clienteNormalizado) ||
          clienteNormalizado <= 0
        ) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro: 'Cliente inválido.',
          })
        }

        const clienteResultado =
          await client.query(
            `
            SELECT id, ativo, clube
            FROM clientes
            WHERE id = $1
              AND empresa_id = $2
            `,
            [
              clienteNormalizado,
              req.usuario.empresaId,
            ],
          )

        if (!clienteResultado.rows[0]) {
          await client.query('ROLLBACK')

          return res.status(404).json({
            erro: 'Cliente não encontrado.',
          })
        }

        if (
          clienteResultado.rows[0].ativo === false
        ) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro: 'Cliente está inativo.',
          })
        }

        clienteClube =
          clienteResultado.rows[0].clube === true
      }

      const itensNormalizados = []

      // Trava cada produto antes de mexer no estoque
      for (const item of itens) {
        const produtoId =
          numero(item.produtoId)

        const quantidade =
          numero(item.quantidade)

        if (
          produtoId === null ||
          quantidade === null ||
          quantidade <= 0
        ) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro: 'Existe um item inválido na venda.',
          })
        }

        const resultadoProduto =
          await client.query(
            `
            SELECT *
            FROM produtos
            WHERE id = $1
              AND empresa_id = $2
            FOR UPDATE
            `,
            [
              produtoId,
              req.usuario.empresaId,
            ],
          )

        if (!resultadoProduto.rows[0]) {
          await client.query('ROLLBACK')

          return res.status(404).json({
            erro: `Produto ${produtoId} não encontrado.`,
          })
        }

        const produto =
          resultadoProduto.rows[0]

        if (produto.ativo === false) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro: `O produto "${produto.nome}" está inativo.`,
          })
        }

        const estoqueAtual =
          Number(produto.estoque)

        if (quantidade > estoqueAtual) {
          await client.query('ROLLBACK')

          return res.status(409).json({
            erro:
              `Estoque insuficiente para "${produto.nome}". ` +
              `Disponível: ${estoqueAtual}.`,
          })
        }

        const possuiPrecoClube =
          clienteClube &&
          produto.clube_ativo === true &&
          produto.preco_clube !== null &&
          produto.preco_clube !== undefined

        const precoUnitario = possuiPrecoClube
          ? Number(produto.preco_clube)
          : Number(produto.preco)

        if (
          !Number.isFinite(precoUnitario) ||
          precoUnitario < 0
        ) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro: `Preço inválido para "${produto.nome}".`,
          })
        }

        itensNormalizados.push({
          produtoId: produto.id,
          nome: produto.nome,
          quantidade,
          precoUnitario,
          subtotal:
            quantidade * precoUnitario,
        })
      }

      const subtotal =
        itensNormalizados.reduce(
          (total, item) =>
            total + item.subtotal,
          0,
        )

      const descontoNormalizado =
        numero(desconto)

      if (
        descontoNormalizado === null ||
        descontoNormalizado < 0 ||
        descontoNormalizado > subtotal
      ) {
        await client.query('ROLLBACK')

        return res.status(400).json({
          erro: 'Desconto inválido.',
        })
      }

      const total =
        subtotal - descontoNormalizado

      // Cria a venda
      const resultadoVenda =
        await client.query(
          `
          INSERT INTO vendas (
            empresa_id,
            usuario_id,
            caixa_id,
            terminal,
            cliente_id,
            subtotal,
            desconto,
            total,
            forma_pagamento,
            status,
            criada_em
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            'concluida',
            CURRENT_TIMESTAMP
          )
          RETURNING *
          `,
          [
            req.usuario.empresaId,
            req.usuario.id,
            caixa.id,
            terminalNormalizado,
            clienteNormalizado,
            subtotal,
            descontoNormalizado,
            total,
            pagamento,
          ],
        )

      const venda = resultadoVenda.rows[0]

      // Itens + baixa de estoque
      for (const item of itensNormalizados) {
        await client.query(
          `
          INSERT INTO venda_itens (
            venda_id,
            produto_id,
            nome_produto,
            quantidade,
            preco_unitario,
            subtotal
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          `,
          [
            venda.id,
            item.produtoId,
            item.nome,
            item.quantidade,
            item.precoUnitario,
            item.subtotal,
          ],
        )

        await client.query(
          `
          UPDATE produtos
          SET
            estoque = estoque - $1,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
            AND empresa_id = $3
          `,
          [
            item.quantidade,
            item.produtoId,
            req.usuario.empresaId,
          ],
        )

        const estoqueDepoisVenda = await client.query(
          `
          SELECT estoque
          FROM produtos
          WHERE id = $1
            AND empresa_id = $2
          `,
          [
            item.produtoId,
            req.usuario.empresaId,
          ],
        )

        const estoquePosteriorVenda =
          Number(estoqueDepoisVenda.rows[0].estoque)

        const estoqueAnteriorVenda =
          estoquePosteriorVenda + Number(item.quantidade)

        await client.query(
          `
          INSERT INTO movimentacoes_estoque
          (
            empresa_id,
            produto_id,
            usuario_id,
            tipo,
            quantidade,
            estoque_anterior,
            estoque_posterior,
            referencia,
            observacao
          )
          VALUES ($1,$2,$3,'saida',$4,$5,$6,$7,$8)
          `,
          [
            req.usuario.empresaId,
            item.produtoId,
            req.usuario.id,
            Number(item.quantidade),
            estoqueAnteriorVenda,
            estoquePosteriorVenda,
            'VENDA #' + venda.id,
            'Baixa automática de estoque pela venda',
          ],
        )
      }

      // Atualiza caixa
      let colunaCaixa

      if (pagamento === 'Dinheiro') {
        colunaCaixa = 'vendas_dinheiro'
      }

      if (pagamento === 'Pix') {
        colunaCaixa = 'vendas_pix'
      }

      if (
        pagamento === 'Cartão de débito'
      ) {
        colunaCaixa = 'vendas_debito'
      }

      if (
        pagamento === 'Cartão de crédito'
      ) {
        colunaCaixa = 'vendas_credito'
      }

      await client.query(
        `
        UPDATE caixas
        SET ${colunaCaixa} =
          ${colunaCaixa} + $1
        WHERE id = $2
          AND empresa_id = $3
        `,
        [
          total,
          caixa.id,
          req.usuario.empresaId,
        ],
      )

      await client.query('COMMIT')

      return res.status(201).json({
        mensagem:
          'Venda realizada com sucesso.',
        venda: mapVenda(
          venda,
          itensNormalizados,
        ),
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      console.error(
        'Erro ao realizar venda:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível concluir a venda.',
      })
    } finally {
      client.release()
    }
  },
)

// BUSCAR VENDA
router.get(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM vendas
        WHERE id = $1
          AND empresa_id = $2
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Venda não encontrada.',
        })
      }

      const itens =
        await carregarItensVenda(
          pool,
          resultado.rows[0].id,
        )

      return res.status(200).json({
        venda: mapVenda(
          resultado.rows[0],
          itens,
        ),
      })
    } catch (erro) {
      console.error(
        'Erro ao buscar venda:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível buscar a venda.',
      })
    }
  },
)

// CANCELAR VENDA
router.patch(
  '/:id/cancelar',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const resultadoVenda =
        await client.query(
          `
          SELECT *
          FROM vendas
          WHERE id = $1
            AND empresa_id = $2
          FOR UPDATE
          `,
          [
            req.params.id,
            req.usuario.empresaId,
          ],
        )

      if (!resultadoVenda.rows[0]) {
        await client.query('ROLLBACK')

        return res.status(404).json({
          erro: 'Venda não encontrada.',
        })
      }

      const venda = resultadoVenda.rows[0]

      if (venda.status === 'cancelada') {
        await client.query('ROLLBACK')

        return res.status(409).json({
          erro: 'Esta venda já está cancelada.',
        })
      }

      const resultadoItens =
        await client.query(
          `
          SELECT *
          FROM venda_itens
          WHERE venda_id = $1
          ORDER BY id
          `,
          [venda.id],
        )

      // Devolve estoque
      for (const item of resultadoItens.rows) {
        await client.query(
          `
          UPDATE produtos
          SET
            estoque =
              estoque + $1,
            atualizado_em =
              CURRENT_TIMESTAMP
          WHERE id = $2
            AND empresa_id = $3
          `,
          [
            Number(item.quantidade),
            item.produto_id,
            req.usuario.empresaId,
          ],
        )

        const estoqueDepoisCancelamento =
          await client.query(
            `
            SELECT estoque
            FROM produtos
            WHERE id = $1
              AND empresa_id = $2
            `,
            [
              item.produto_id,
              req.usuario.empresaId,
            ],
          )

        const estoquePosteriorCancelamento =
          Number(
            estoqueDepoisCancelamento.rows[0].estoque,
          )

        const estoqueAnteriorCancelamento =
          estoquePosteriorCancelamento -
          Number(item.quantidade)

        await client.query(
          `
          INSERT INTO movimentacoes_estoque
          (
            empresa_id,
            produto_id,
            usuario_id,
            tipo,
            quantidade,
            estoque_anterior,
            estoque_posterior,
            referencia,
            observacao
          )
          VALUES ($1,$2,$3,'entrada',$4,$5,$6,$7,$8)
          `,
          [
            req.usuario.empresaId,
            item.produto_id,
            req.usuario.id,
            Number(item.quantidade),
            estoqueAnteriorCancelamento,
            estoquePosteriorCancelamento,
            'CANCELAMENTO VENDA #' + venda.id,
            'Estorno automático de estoque por cancelamento da venda',
          ],
        )
      }

      // Se o caixa original ainda estiver aberto,
      // estorna o total dele.
      const resultadoCaixa =
        await client.query(
          `
          SELECT *
          FROM caixas
          WHERE id = $1
            AND empresa_id = $2
            AND status = 'aberto'
          FOR UPDATE
          `,
          [
            venda.caixa_id,
            req.usuario.empresaId,
          ],
        )

      if (resultadoCaixa.rows[0]) {
        let colunaCaixa

        if (
          venda.forma_pagamento ===
          'Dinheiro'
        ) {
          colunaCaixa =
            'vendas_dinheiro'
        }

        if (
          venda.forma_pagamento ===
          'Pix'
        ) {
          colunaCaixa =
            'vendas_pix'
        }

        if (
          venda.forma_pagamento ===
          'Cartão de débito'
        ) {
          colunaCaixa =
            'vendas_debito'
        }

        if (
          venda.forma_pagamento ===
          'Cartão de crédito'
        ) {
          colunaCaixa =
            'vendas_credito'
        }

        if (colunaCaixa) {
          await client.query(
            `
            UPDATE caixas
            SET ${colunaCaixa} =
              GREATEST(
                0,
                ${colunaCaixa} - $1
              )
            WHERE id = $2
              AND empresa_id = $3
            `,
            [
              Number(venda.total),
              venda.caixa_id,
              req.usuario.empresaId,
            ],
          )
        }
      }

      const atualizado =
        await client.query(
          `
          UPDATE vendas
          SET
            status = 'cancelada',
            cancelada_em =
              CURRENT_TIMESTAMP,
            cancelada_por = $1
          WHERE id = $2
            AND empresa_id = $3
          RETURNING *
          `,
          [
            req.usuario.id,
            venda.id,
            req.usuario.empresaId,
          ],
        )

      await client.query('COMMIT')

      return res.status(200).json({
        mensagem:
          'Venda cancelada com sucesso.',
        venda: mapVenda(
          atualizado.rows[0],
          resultadoItens.rows.map(mapItem),
        ),
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      console.error(
        'Erro ao cancelar venda:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível cancelar a venda.',
      })
    } finally {
      client.release()
    }
  },
)

module.exports = router