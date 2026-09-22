const express = require('express')

const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')
const { processarTef } = require('../services/tef')

const router = express.Router()

function numero(valor) {
  const convertido = Number(valor)

  if (!Number.isFinite(convertido)) {
    return null
  }

  return convertido
}

function validarDocumentoConsumidor(valor) {
  const documento = String(valor || '').replace(/\D/g, '')

  if (!documento) {
    return ''
  }

  if (/^(\d)\1+$/.test(documento)) {
    return null
  }

  if (documento.length === 11) {
    const calcularDigito = (base, pesoInicial) => {
      let soma = 0

      for (let i = 0; i < base.length; i += 1) {
        soma += Number(base[i]) * (pesoInicial - i)
      }

      const resto = (soma * 10) % 11
      return resto === 10 ? 0 : resto
    }

    const primeiro = calcularDigito(documento.slice(0, 9), 10)
    const segundo = calcularDigito(documento.slice(0, 10), 11)

    if (
      primeiro !== Number(documento[9]) ||
      segundo !== Number(documento[10])
    ) {
      return null
    }

    return documento
  }

  if (documento.length === 14) {
    const calcularDigito = (base) => {
      let peso = base.length - 7
      let soma = 0

      for (const digito of base) {
        soma += Number(digito) * peso
        peso -= 1

        if (peso === 1) {
          peso = 9
        }
      }

      const resto = soma % 11
      return resto < 2 ? 0 : 11 - resto
    }

    const primeiro = calcularDigito(documento.slice(0, 12))
    const segundo = calcularDigito(documento.slice(0, 13))

    if (
      primeiro !== Number(documento[12]) ||
      segundo !== Number(documento[13])
    ) {
      return null
    }

    return documento
  }

  return null
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
    documentoConsumidor: r.documento_consumidor || '',

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

async function carregarPagamentosVenda(
  executor,
  vendaId,
) {
  const resultado = await executor.query(
    `
    SELECT
      id,
      forma_pagamento,
      valor,
      criada_em
    FROM venda_pagamentos
    WHERE venda_id = $1
    ORDER BY id
    `,
    [vendaId],
  )

  return resultado.rows.map((r) => ({
    id: r.id,
    formaPagamento: r.forma_pagamento,
    valor: Number(r.valor),
    criadaEm: r.criada_em,
  }))
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
        pagamentos = [],
        desconto = 0,
        terminal = '001',
        documentoConsumidor = '',
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

      const documentoConsumidorNormalizado =
        validarDocumentoConsumidor(documentoConsumidor)

      if (documentoConsumidorNormalizado === null) {
        return res.status(400).json({
          erro: 'CPF/CNPJ do consumidor inválido.',
        })
      }

      const pagamento = String(
        formaPagamento || '',
      ).trim()

      const formasPermitidas = [
        'Pix',
        'Dinheiro',
        'Cartão de débito',
        'Cartão de crédito',
        'Pagamento Misto',
      ]

      const formasParcelasPermitidas = [
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

      if (
        pagamento === 'Pagamento Misto' &&
        (!Array.isArray(pagamentos) || pagamentos.length < 2)
      ) {
        return res.status(400).json({
          erro:
            'Pagamento misto precisa possuir pelo menos duas formas de pagamento.',
        })
      }

      if (pagamento === 'Pagamento Misto') {
        for (const parcela of pagamentos) {
          const formaParcela = String(
            parcela?.formaPagamento || '',
          ).trim()

          const valorParcela = numero(parcela?.valor)

          if (
            !formasParcelasPermitidas.includes(formaParcela) ||
            valorParcela === null ||
            valorParcela <= 0
          ) {
            return res.status(400).json({
              erro:
                'Existe uma forma ou valor inválido no pagamento misto.',
            })
          }
        }
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

          // Snapshot fiscal do produto no momento da venda
          codigoBarras: produto.codigo_barras || null,
          ncm: produto.ncm || null,
          cest: produto.cest || null,
          origemMercadoria:
            produto.origem_mercadoria || null,
          cstIcms: produto.cst_icms || null,
          csosn: produto.csosn || null,
          cfop: produto.cfop || null,
          cstIbsCbs: produto.cst_ibs_cbs || null,
          cclassTrib: produto.cclass_trib || null,
          cstPis: produto.cst_pis || null,
          aliquotaPis:
            produto.aliquota_pis == null
              ? null
              : Number(produto.aliquota_pis),
          cstCofins: produto.cst_cofins || null,
          aliquotaCofins:
            produto.aliquota_cofins == null
              ? null
              : Number(produto.aliquota_cofins),
          aliquotaIcms:
            produto.aliquota_icms == null
              ? null
              : Number(produto.aliquota_icms),
          aliquotaIbsUf:
            produto.aliquota_ibs_uf == null
              ? null
              : Number(produto.aliquota_ibs_uf),
          aliquotaIbsMunicipal:
            produto.aliquota_ibs_municipal == null
              ? null
              : Number(produto.aliquota_ibs_municipal),
          aliquotaCbs:
            produto.aliquota_cbs == null
              ? null
              : Number(produto.aliquota_cbs),
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

      // Monta a composição financeira da venda.
      // Toda venda passa a possuir pagamentos detalhados,
      // inclusive quando existe apenas uma forma.
      let pagamentosNormalizados = []

      if (pagamento === 'Pagamento Misto') {
        pagamentosNormalizados = pagamentos.map((parcela) => ({
          formaPagamento: String(
            parcela.formaPagamento || '',
          ).trim(),
          valor: Number(parcela.valor),
        }))

        const totalPagamentos =
          pagamentosNormalizados.reduce(
            (soma, parcela) => soma + parcela.valor,
            0,
          )

        // Trabalha em centavos para evitar erro de ponto flutuante.
        const totalVendaCentavos =
          Math.round(total * 100)

        const totalPagamentosCentavos =
          Math.round(totalPagamentos * 100)

        if (
          totalPagamentosCentavos !==
          totalVendaCentavos
        ) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro:
              'A soma das formas de pagamento precisa ser igual ao total da venda.',
          })
        }
      } else {
        pagamentosNormalizados = [
          {
            formaPagamento: pagamento,
            valor: total,
          },
        ]
      }

      // ---------------------------------------------------------
      // AUTORIZAÇÃO TEF
      // Cartões são autorizados antes da conclusão da venda.
      // No pagamento misto, apenas as parcelas de cartão passam aqui.
      // ---------------------------------------------------------
      const parcelasCartao =
        pagamentosNormalizados.filter((parcela) =>
          [
            'Cartão de débito',
            'Cartão de crédito',
          ].includes(parcela.formaPagamento),
        )

      const transacoesTefAprovadas = []

      if (parcelasCartao.length > 0) {
        const configuracaoTef = await client.query(
          `
          SELECT
            tef_habilitado,
            tef_modo,
            tef_provedor
          FROM empresas
          WHERE id = $1
          `,
          [req.usuario.empresaId],
        )

        const empresaTef = configuracaoTef.rows[0]

        // Enquanto o TEF não estiver habilitado,
        // preservamos o comportamento atual do PDV.
        // Quando habilitado, cartão exige autorização TEF.
        if (empresaTef?.tef_habilitado) {
          const terminalTef = await client.query(
            `
            SELECT *
            FROM tef_terminais
            WHERE empresa_id = $1
              AND terminal = $2
              AND ativo = TRUE
            `,
            [
              req.usuario.empresaId,
              terminalNormalizado,
            ],
          )

          if (!terminalTef.rows[0]) {
            await client.query('ROLLBACK')

            return res.status(409).json({
              erro:
                `Terminal ${terminalNormalizado} não está configurado para TEF.`,
            })
          }

          for (const parcela of parcelasCartao) {
            const tipoTef =
              parcela.formaPagamento ===
              'Cartão de débito'
                ? 'debito'
                : 'credito'

            const registroTef = await client.query(
              `
              INSERT INTO tef_transacoes (
                empresa_id,
                terminal,
                tipo,
                valor,
                provedor,
                modo,
                status
              )
              VALUES (
                $1, $2, $3, $4, $5, $6, 'iniciada'
              )
              RETURNING *
              `,
              [
                req.usuario.empresaId,
                terminalNormalizado,
                tipoTef,
                parcela.valor,
                empresaTef.tef_provedor,
                empresaTef.tef_modo,
              ],
            )

            const transacaoTef =
              registroTef.rows[0]

            let retornoTef

            try {
              retornoTef = await processarTef({
                modo: empresaTef.tef_modo,
                provedor: empresaTef.tef_provedor,
                tipo: tipoTef,
                valor: parcela.valor,
                terminal: terminalNormalizado,
              })
            } catch (erroTef) {
              await client.query(
                `
                UPDATE tef_transacoes
                SET
                  status = 'erro',
                  mensagem = $1,
                  atualizada_em = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [
                  erroTef.message,
                  transacaoTef.id,
                ],
              )

              await client.query('COMMIT')

              return res.status(502).json({
                erro:
                  `Falha no TEF: ${erroTef.message}`,
              })
            }

            if (retornoTef.status !== 'aprovada') {
              await client.query(
                `
                UPDATE tef_transacoes
                SET
                  status = $1,
                  mensagem = $2,
                  atualizada_em = CURRENT_TIMESTAMP
                WHERE id = $3
                `,
                [
                  retornoTef.status || 'negada',
                  retornoTef.mensagem || null,
                  transacaoTef.id,
                ],
              )

              await client.query('COMMIT')

              return res.status(402).json({
                erro:
                  retornoTef.mensagem ||
                  'Pagamento não autorizado pelo TEF.',
              })
            }

            await client.query(
              `
              UPDATE tef_transacoes
              SET
                status = 'aprovada',
                nsu = $1,
                autorizacao = $2,
                identificador_externo = $3,
                mensagem = $4,
                atualizada_em = CURRENT_TIMESTAMP
              WHERE id = $5
              `,
              [
                retornoTef.nsu || null,
                retornoTef.autorizacao || null,
                retornoTef.identificadorExterno || null,
                retornoTef.mensagem || null,
                transacaoTef.id,
              ],
            )

            transacoesTefAprovadas.push(
              transacaoTef.id,
            )
          }
        }
      }

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
            documento_consumidor,
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
            $10,
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
            documentoConsumidorNormalizado || null,
          ],
        )

      const venda = resultadoVenda.rows[0]

      // ---------------------------------------------------------
      // REGISTRO FISCAL NFC-e
      // Reserva série/número somente quando a NFC-e estiver
      // habilitada para a empresa.
      // A autorização da SEFAZ ocorre em etapa própria.
      // ---------------------------------------------------------
      let nfce = null

      const resultadoEmpresaFiscal =
        await client.query(
          `
          SELECT
            nome,
            cnpj,
            inscricao_estadual,
            estado,
            cidade,
            codigo_municipio_ibge,
            regime_tributario,
            nfce_habilitada,
            nfce_ambiente,
            nfce_serie,
            nfce_proximo_numero,
            nfce_csc_id,
            nfce_csc
          FROM empresas
          WHERE id = $1
          FOR UPDATE
          `,
          [req.usuario.empresaId],
        )

      const empresaFiscal =
        resultadoEmpresaFiscal.rows[0]

      if (empresaFiscal?.nfce_habilitada) {
        const camposObrigatorios = [
          ['CNPJ', empresaFiscal.cnpj],
          ['Inscrição Estadual', empresaFiscal.inscricao_estadual],
          ['UF', empresaFiscal.estado],
          ['Cidade', empresaFiscal.cidade],
          [
            'Código IBGE do município',
            empresaFiscal.codigo_municipio_ibge,
          ],
          [
            'Regime tributário',
            empresaFiscal.regime_tributario,
          ],
        ]

        const camposAusentes =
          camposObrigatorios
            .filter(([, valor]) => !String(valor || '').trim())
            .map(([nome]) => nome)

        if (camposAusentes.length > 0) {
          throw new Error(
            'NFC-e habilitada, mas faltam dados fiscais: ' +
              camposAusentes.join(', ') +
              '.',
          )
        }

        if (
          !['homologacao', 'producao'].includes(
            String(empresaFiscal.nfce_ambiente || ''),
          )
        ) {
          throw new Error(
            'Ambiente da NFC-e deve ser homologacao ou producao.',
          )
        }

        const serieNfce =
          Number(empresaFiscal.nfce_serie)

        const numeroNfce =
          Number(empresaFiscal.nfce_proximo_numero)

        if (
          !Number.isInteger(serieNfce) ||
          serieNfce <= 0 ||
          !Number.isInteger(numeroNfce) ||
          numeroNfce <= 0
        ) {
          throw new Error(
            'Série ou próximo número da NFC-e inválido.',
          )
        }

        const resultadoNfce =
          await client.query(
            `
            INSERT INTO nfce (
              empresa_id,
              venda_id,
              ambiente,
              serie,
              numero,
              status,
              documento_consumidor
            )
            VALUES (
              $1, $2, $3, $4, $5, 'pendente', $6
            )
            RETURNING *
            `,
            [
              req.usuario.empresaId,
              venda.id,
              empresaFiscal.nfce_ambiente || 'homologacao',
              serieNfce,
              numeroNfce,
              documentoConsumidorNormalizado || null,
            ],
          )

        nfce = resultadoNfce.rows[0]

        await client.query(
          `
          UPDATE empresas
          SET
            nfce_proximo_numero =
              nfce_proximo_numero + 1,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $1
          `,
          [req.usuario.empresaId],
        )
      }

      if (transacoesTefAprovadas.length > 0) {
        await client.query(
          `
          UPDATE tef_transacoes
          SET
            venda_id = $1,
            atualizada_em = CURRENT_TIMESTAMP
          WHERE id = ANY($2::int[])
          `,
          [
            venda.id,
            transacoesTefAprovadas,
          ],
        )
      }

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
            subtotal,
            codigo_barras,
            ncm,
            cest,
            origem_mercadoria,
            cst_icms,
            csosn,
            cfop,
            cst_ibs_cbs,
            cclass_trib,
            cst_pis,
            aliquota_pis,
            cst_cofins,
            aliquota_cofins,
            aliquota_icms,
            aliquota_ibs_uf,
            aliquota_ibs_municipal,
            aliquota_cbs
          )
          VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15,
            $16, $17, $18, $19, $20,
            $21, $22, $23
          )
          `,
          [
            venda.id,
            item.produtoId,
            item.nome,
            item.quantidade,
            item.precoUnitario,
            item.subtotal,
            item.codigoBarras,
            item.ncm,
            item.cest,
            item.origemMercadoria,
            item.cstIcms,
            item.csosn,
            item.cfop,
            item.cstIbsCbs,
            item.cclassTrib,
            item.cstPis,
            item.aliquotaPis,
            item.cstCofins,
            item.aliquotaCofins,
            item.aliquotaIcms,
            item.aliquotaIbsUf,
            item.aliquotaIbsMunicipal,
            item.aliquotaCbs,
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

      // Registra os pagamentos detalhados e
      // atualiza cada forma no caixa.
      const colunasPagamento = {
        Dinheiro: 'vendas_dinheiro',
        Pix: 'vendas_pix',
        'Cartão de débito': 'vendas_debito',
        'Cartão de crédito': 'vendas_credito',
      }

      for (const parcela of pagamentosNormalizados) {
        await client.query(
          `
          INSERT INTO venda_pagamentos (
            venda_id,
            forma_pagamento,
            valor
          )
          VALUES ($1, $2, $3)
          `,
          [
            venda.id,
            parcela.formaPagamento,
            parcela.valor,
          ],
        )

        const colunaCaixa =
          colunasPagamento[parcela.formaPagamento]

        if (!colunaCaixa) {
          throw new Error(
            'Forma de pagamento sem coluna correspondente no caixa.',
          )
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
            parcela.valor,
            caixa.id,
            req.usuario.empresaId,
          ],
        )
      }

      await client.query('COMMIT')

      return res.status(201).json({
        mensagem:
          'Venda realizada com sucesso.',
        venda: mapVenda(
          venda,
          itensNormalizados,
        ),
        nfce: nfce
          ? {
              id: nfce.id,
              serie: nfce.serie,
              numero: nfce.numero,
              ambiente: nfce.ambiente,
              status: nfce.status,
              documentoConsumidor:
                nfce.documento_consumidor || '',
            }
          : null,
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
        const pagamentosVenda =
          await carregarPagamentosVenda(
            client,
            venda.id,
          )

        const colunasPagamento = {
          Dinheiro: 'vendas_dinheiro',
          Pix: 'vendas_pix',
          'Cartão de débito': 'vendas_debito',
          'Cartão de crédito': 'vendas_credito',
        }

        // Compatibilidade com vendas antigas,
        // realizadas antes da tabela venda_pagamentos.
        if (pagamentosVenda.length === 0) {
          const colunaCaixa =
            colunasPagamento[venda.forma_pagamento]

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
        } else {
          for (const parcela of pagamentosVenda) {
            const colunaCaixa =
              colunasPagamento[parcela.formaPagamento]

            if (!colunaCaixa) {
              throw new Error(
                'Forma de pagamento inválida no estorno.',
              )
            }

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
                parcela.valor,
                venda.caixa_id,
                req.usuario.empresaId,
              ],
            )
          }
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