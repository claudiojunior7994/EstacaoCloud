const express = require('express')
const router = express.Router()

module.exports = function recebimentosRoutes(pool, autenticar) {

  // LISTAR RECEBIMENTOS
  router.get('/', autenticar, async (req, res) => {
    try {
      const resultado = await pool.query(`
        SELECT
          r.*,
          f.nome AS fornecedor_nome
        FROM recebimentos r
        LEFT JOIN fornecedores f ON f.id = r.fornecedor_id
        ORDER BY r.criado_em DESC
      `)

      res.json({ recebimentos: resultado.rows })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao listar recebimentos.' })
    }
  })

  // DETALHAR RECEBIMENTO
  router.get('/:id', autenticar, async (req, res) => {
    try {
      const recebimento = await pool.query(
        `
        SELECT
          r.*,
          f.nome AS fornecedor_nome
        FROM recebimentos r
        LEFT JOIN fornecedores f ON f.id = r.fornecedor_id
        WHERE r.id = $1
        `,
        [req.params.id]
      )

      if (!recebimento.rows.length) {
        return res.status(404).json({ erro: 'Recebimento não encontrado.' })
      }

      const itens = await pool.query(
        `
        SELECT
          ri.*,
          p.nome AS produto_nome,
          p.codigo_barras,
          p.plu,
          p.unidade
        FROM recebimento_itens ri
        INNER JOIN produtos p ON p.id = ri.produto_id
        WHERE ri.recebimento_id = $1
        ORDER BY p.nome
        `,
        [req.params.id]
      )

      res.json({
        recebimento: recebimento.rows[0],
        itens: itens.rows,
      })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao carregar recebimento.' })
    }
  })

  // CRIAR RECEBIMENTO
  router.post('/', autenticar, async (req, res) => {
    const {
      fornecedorId,
      numeroDocumento,
      observacao,
      itens = [],
    } = req.body

    if (!fornecedorId) {
      return res.status(400).json({ erro: 'Informe o fornecedor.' })
    }

    if (!Array.isArray(itens) || !itens.length) {
      return res.status(400).json({
        erro: 'Adicione pelo menos um produto ao recebimento.',
      })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const recebimentoResultado = await client.query(
        `
        INSERT INTO recebimentos
          (fornecedor_id, numero_documento, observacao, status)
        VALUES ($1, $2, $3, 'recebido')
        RETURNING *
        `,
        [
          fornecedorId,
          numeroDocumento || null,
          observacao || null,
        ]
      )

      const recebimento = recebimentoResultado.rows[0]

      for (const item of itens) {
        const quantidade = Number(item.quantidade)

        if (!item.produtoId || !quantidade || quantidade <= 0) {
          throw new Error('Produto ou quantidade inválida.')
        }

        const produtoResultado = await client.query(
          `
          SELECT id, estoque
          FROM produtos
          WHERE id = $1
          FOR UPDATE
          `,
          [item.produtoId]
        )

        if (!produtoResultado.rows.length) {
          throw new Error('Produto não encontrado.')
        }

        const estoqueAnterior =
          Number(produtoResultado.rows[0].estoque || 0)

        const estoquePosterior =
          estoqueAnterior + quantidade

        await client.query(
          `
          INSERT INTO recebimento_itens
            (recebimento_id, produto_id, quantidade, custo_unitario)
          VALUES ($1, $2, $3, $4)
          `,
          [
            recebimento.id,
            item.produtoId,
            quantidade,
            Number(item.custoUnitario || 0),
          ]
        )

        if (item.lote && String(item.lote).trim()) {
          await client.query(
            `
            INSERT INTO produto_lotes
              (
                produto_id,
                recebimento_id,
                lote,
                quantidade,
                validade,
                custo_unitario
              )
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
              item.produtoId,
              recebimento.id,
              String(item.lote).trim(),
              quantidade,
              item.validade || null,
              Number(item.custoUnitario || 0),
            ]
          )
        }

        await client.query(
          `
          UPDATE produtos
          SET estoque = $1, atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2 AND empresa_id = $3
          `,
          [estoquePosterior, item.produtoId, req.usuario.empresaId]
        )

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
          VALUES ($1, $2, $3, 'entrada', $4, $5, $6, $7, $8)
          `,
          [
            req.usuario.empresaId,
            item.produtoId,
            req.usuario.id,
            quantidade,
            estoqueAnterior,
            estoquePosterior,
            `RECEBIMENTO #${recebimento.id}`,
            observacao || 'Recebimento de mercadoria',
          ]
        )
      }

      await client.query('COMMIT')

      res.status(201).json({
        mensagem: 'Mercadoria recebida e estoque atualizado.',
        recebimento,
      })
    } catch (erro) {
      await client.query('ROLLBACK')
      console.error(erro)
      res.status(400).json({
        erro: erro.message || 'Erro ao registrar recebimento.',
      })
    } finally {
      client.release()
    }
  })

  return router
}
