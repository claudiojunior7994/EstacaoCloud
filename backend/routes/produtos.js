const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

const UNIDADES = [
  'UN', 'KG', 'G', 'L', 'ML',
  'CX', 'PC', 'PCT', 'DZ'
]

function texto(v) {
  return String(v == null ? '' : v).trim()
}

function numero(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function inteiroOuNull(v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

function booleano(v, padrao = false) {
  if (v === undefined || v === null) return padrao
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') {
    return ['true', '1', 'sim', 'on'].includes(v.toLowerCase())
  }
  return Boolean(v)
}

function mapProduto(r) {
  return {
    id: r.id,
    empresaId: r.empresa_id,

    nome: r.nome,
    codigoBarras: r.codigo_barras,

    preco: Number(r.preco),
    custo: Number(r.custo),

    estoque: Number(r.estoque),
    estoqueMinimo: Number(r.estoque_minimo),

    fornecedor: r.fornecedor || '',
    fornecedorId:
      r.fornecedor_id == null
        ? null
        : Number(r.fornecedor_id),

    fornecedorNome:
      r.fornecedor_nome || r.fornecedor || '',

    categoria: r.categoria || '',

    // FISCAL
    ncm: r.ncm || '',
    cest: r.cest || '',
    origemMercadoria: r.origem_mercadoria || '',
    cstIcms: r.cst_icms || '',
    csosn: r.csosn || '',
    cfop: r.cfop || '',
    cstIbsCbs: r.cst_ibs_cbs || '',
    cclassTrib: r.cclass_trib || '',

    cstPis: r.cst_pis || '',
    aliquotaPis:
      r.aliquota_pis == null ? null : Number(r.aliquota_pis),
    cstCofins: r.cst_cofins || '',
    aliquotaCofins:
      r.aliquota_cofins == null ? null : Number(r.aliquota_cofins),
    aliquotaIcms:
      r.aliquota_icms == null ? null : Number(r.aliquota_icms),
    aliquotaIbsUf:
      r.aliquota_ibs_uf == null ? null : Number(r.aliquota_ibs_uf),
    aliquotaIbsMunicipal:
      r.aliquota_ibs_municipal == null
        ? null
        : Number(r.aliquota_ibs_municipal),
    aliquotaCbs:
      r.aliquota_cbs == null ? null : Number(r.aliquota_cbs),

    unidade: r.unidade || 'UN',
    pesavel: Boolean(r.pesavel),
    plu: r.plu || '',

    etiquetaAtiva:
      r.etiqueta_ativa === undefined
        ? true
        : Boolean(r.etiqueta_ativa),

    clubeAtivo: Boolean(r.clube_ativo),

    precoClube:
      r.preco_clube == null
        ? null
        : Number(r.preco_clube),

    ativo: Boolean(r.ativo),

    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  }
}

function validarUnidade(unidade) {
  return UNIDADES.includes(unidade)
}

async function fornecedorValido(
  fornecedorId,
  empresaId,
) {
  if (fornecedorId == null) return null

  const r = await pool.query(
    `
    SELECT id, nome
    FROM fornecedores
    WHERE id = $1
      AND empresa_id = $2
    `,
    [fornecedorId, empresaId],
  )

  return r.rows[0] || false
}

// ======================================================
// LISTAR
// admin / gerente / operador / estoque
// ======================================================

router.get(
  '/',
  autenticar,
  permitirPerfis(
    'admin',
    'gerente',
    'operador',
    'estoque',
  ),
  async (req, res) => {
    try {
      const busca = texto(req.query.busca)

      const resultado = await pool.query(
        `
        SELECT
          p.*,
          f.nome AS fornecedor_nome
        FROM produtos p
        LEFT JOIN fornecedores f
          ON f.id = p.fornecedor_id
         AND f.empresa_id = p.empresa_id
        WHERE p.empresa_id = $1
          AND (
            $2 = ''
            OR p.nome ILIKE '%' || $2 || '%'
            OR p.codigo_barras ILIKE '%' || $2 || '%'
            OR COALESCE(p.plu, '') ILIKE '%' || $2 || '%'
            OR COALESCE(p.categoria, '') ILIKE '%' || $2 || '%'
          )
        ORDER BY p.nome
        `,
        [
          req.usuario.empresaId,
          busca,
        ],
      )

      return res.status(200).json({
        produtos: resultado.rows.map(mapProduto),
      })
    } catch (erro) {
      console.error(
        'Erro ao listar produtos:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível carregar os produtos.',
      })
    }
  },
)

// ======================================================
// BUSCAR POR CÓDIGO / PLU
// importante para PDV e balança
// ======================================================

router.get(
  '/buscar/codigo/:codigo',
  autenticar,
  permitirPerfis(
    'admin',
    'gerente',
    'operador',
    'estoque',
  ),
  async (req, res) => {
    try {
      const codigo = texto(req.params.codigo)

      const resultado = await pool.query(
        `
        SELECT
          p.*,
          f.nome AS fornecedor_nome
        FROM produtos p
        LEFT JOIN fornecedores f
          ON f.id = p.fornecedor_id
         AND f.empresa_id = p.empresa_id
        WHERE p.empresa_id = $1
          AND p.ativo = TRUE
          AND (
            p.codigo_barras = $2
            OR p.plu = $2
          )
        LIMIT 1
        `,
        [
          req.usuario.empresaId,
          codigo,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Produto não encontrado.',
        })
      }

      return res.json({
        produto: mapProduto(resultado.rows[0]),
      })
    } catch (erro) {
      console.error(
        'Erro ao buscar produto por código:',
        erro,
      )

      return res.status(500).json({
        erro: 'Erro ao buscar produto.',
      })
    }
  },
)

// ======================================================
// BUSCAR POR ID
// ======================================================

router.get(
  '/:id',
  autenticar,
  permitirPerfis(
    'admin',
    'gerente',
    'operador',
    'estoque',
  ),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT
          p.*,
          f.nome AS fornecedor_nome
        FROM produtos p
        LEFT JOIN fornecedores f
          ON f.id = p.fornecedor_id
         AND f.empresa_id = p.empresa_id
        WHERE p.id = $1
          AND p.empresa_id = $2
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Produto não encontrado.',
        })
      }

      return res.status(200).json({
        produto: mapProduto(
          resultado.rows[0],
        ),
      })
    } catch (erro) {
      console.error(
        'Erro ao buscar produto:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível buscar o produto.',
      })
    }
  },
)

// ======================================================
// CRIAR
// ======================================================

router.post(
  '/',
  autenticar,
  permitirPerfis(
    'admin',
    'gerente',
    'estoque',
  ),
  async (req, res) => {
    try {
      const nome = texto(req.body.nome)
      const codigoBarras = texto(
        req.body.codigoBarras,
      )

      const preco = numero(req.body.preco)
      const custo = numero(
        req.body.custo ?? 0,
      )

      const estoque = numero(
        req.body.estoque ?? 0,
      )

      const estoqueMinimo = numero(
        req.body.estoqueMinimo ?? 0,
      )

      const fornecedor = texto(
        req.body.fornecedor,
      )

      const fornecedorId = inteiroOuNull(
        req.body.fornecedorId,
      )

      const categoria = texto(
        req.body.categoria,
      )

      // DADOS FISCAIS
      const ncm = texto(req.body.ncm)
      const cest = texto(req.body.cest)
      const origemMercadoria = texto(
        req.body.origemMercadoria,
      )
      const cstIcms = texto(req.body.cstIcms)
      const csosn = texto(req.body.csosn)
      const cfop = texto(req.body.cfop)
      const cstIbsCbs = texto(req.body.cstIbsCbs)
      const cclassTrib = texto(req.body.cclassTrib)
      const cstPis = texto(req.body.cstPis)
      const aliquotaPis =
        req.body.aliquotaPis === '' ||
        req.body.aliquotaPis == null
          ? null
          : Number(req.body.aliquotaPis)
      const cstCofins = texto(req.body.cstCofins)
      const aliquotaCofins =
        req.body.aliquotaCofins === '' ||
        req.body.aliquotaCofins == null
          ? null
          : Number(req.body.aliquotaCofins)
      const aliquotaIcms =
        req.body.aliquotaIcms === '' ||
        req.body.aliquotaIcms == null
          ? null
          : Number(req.body.aliquotaIcms)
      const aliquotaIbsUf =
        req.body.aliquotaIbsUf === '' ||
        req.body.aliquotaIbsUf == null
          ? null
          : Number(req.body.aliquotaIbsUf)
      const aliquotaIbsMunicipal =
        req.body.aliquotaIbsMunicipal === '' ||
        req.body.aliquotaIbsMunicipal == null
          ? null
          : Number(req.body.aliquotaIbsMunicipal)
      const aliquotaCbs =
        req.body.aliquotaCbs === '' ||
        req.body.aliquotaCbs == null
          ? null
          : Number(req.body.aliquotaCbs)

      const unidade = texto(
        req.body.unidade || 'UN',
      ).toUpperCase()

      const pesavel = booleano(
        req.body.pesavel,
        false,
      )

      const plu = texto(req.body.plu)

      const etiquetaAtiva = booleano(
        req.body.etiquetaAtiva,
        true,
      )

      const clubeAtivo = booleano(
        req.body.clubeAtivo,
        false,
      )

      const precoClube =
        req.body.precoClube === '' ||
        req.body.precoClube == null
          ? null
          : numero(req.body.precoClube)

      if (!nome) {
        return res.status(400).json({
          erro:
            'Nome do produto é obrigatório.',
        })
      }

      if (!codigoBarras && !plu) {
        return res.status(400).json({
          erro:
            'Informe código de barras ou PLU.',
        })
      }

      if (
        preco === null ||
        preco < 0
      ) {
        return res.status(400).json({
          erro: 'Preço inválido.',
        })
      }

      if (
        custo === null ||
        custo < 0
      ) {
        return res.status(400).json({
          erro: 'Custo inválido.',
        })
      }

      if (
        estoque === null ||
        estoque < 0
      ) {
        return res.status(400).json({
          erro: 'Estoque inválido.',
        })
      }

      if (
        estoqueMinimo === null ||
        estoqueMinimo < 0
      ) {
        return res.status(400).json({
          erro:
            'Estoque mínimo inválido.',
        })
      }

      if (!validarUnidade(unidade)) {
        return res.status(400).json({
          erro:
            'Unidade de medida inválida.',
        })
      }

      if (pesavel && !plu) {
        return res.status(400).json({
          erro:
            'Produto pesável precisa possuir PLU.',
        })
      }

      if (
        clubeAtivo &&
        (
          precoClube === null ||
          precoClube < 0
        )
      ) {
        return res.status(400).json({
          erro:
            'Informe um preço Clube válido.',
        })
      }

      const fornecedorEncontrado =
        await fornecedorValido(
          fornecedorId,
          req.usuario.empresaId,
        )

      if (fornecedorEncontrado === false) {
        return res.status(400).json({
          erro:
            'Fornecedor não pertence à empresa.',
        })
      }

      const nomeFornecedor =
        fornecedorEncontrado
          ? fornecedorEncontrado.nome
          : fornecedor

      const resultado = await pool.query(
        `
        INSERT INTO produtos (
          empresa_id,
          nome,
          codigo_barras,
          preco,
          custo,
          estoque,
          estoque_minimo,
          fornecedor,
          fornecedor_id,
          categoria,
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
          aliquota_cbs,
          unidade,
          pesavel,
          plu,
          etiqueta_ativa,
          clube_ativo,
          preco_clube,
          ativo
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          $10,$11,$12,$13,$14,$15,$16,
          $17,$18,$19,$20,$21,$22,$23,$24,
          $25,$26,$27,$28,$29,$30,$31,$32,
          TRUE
        )
        RETURNING *
        `,
        [
          req.usuario.empresaId,
          nome,
          codigoBarras || null,
          preco,
          custo,
          estoque,
          estoqueMinimo,
          nomeFornecedor,
          fornecedorId,
          categoria,
          ncm || null,
          cest || null,
          origemMercadoria || null,
          cstIcms || null,
          csosn || null,
          cfop || null,
          cstIbsCbs || null,
          cclassTrib || null,
          cstPis || null,
          aliquotaPis,
          cstCofins || null,
          aliquotaCofins,
          aliquotaIcms,
          aliquotaIbsUf,
          aliquotaIbsMunicipal,
          aliquotaCbs,
          unidade,
          pesavel,
          plu || null,
          etiquetaAtiva,
          clubeAtivo,
          precoClube,
        ],
      )

      // registra estoque inicial
      if (estoque > 0) {
        await pool.query(
          `
          INSERT INTO movimentacoes_estoque (
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
          VALUES (
            $1,$2,$3,'entrada',
            $4,0,$4,
            'CADASTRO PRODUTO',
            'Estoque inicial'
          )
          `,
          [
            req.usuario.empresaId,
            resultado.rows[0].id,
            req.usuario.id,
            estoque,
          ],
        )
      }

      return res.status(201).json({
        mensagem:
          'Produto cadastrado com sucesso.',
        produto: mapProduto(
          resultado.rows[0],
        ),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro:
            'Código de barras ou PLU já cadastrado.',
        })
      }

      console.error(
        'Erro ao criar produto:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível cadastrar o produto.',
      })
    }
  },
)

// ======================================================
// EDITAR
// ======================================================

router.patch(
  '/:id',
  autenticar,
  permitirPerfis(
    'admin',
    'gerente',
    'estoque',
  ),
  async (req, res) => {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const atual = await client.query(
        `
        SELECT *
        FROM produtos
        WHERE id = $1
          AND empresa_id = $2
        FOR UPDATE
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!atual.rows[0]) {
        await client.query('ROLLBACK')

        return res.status(404).json({
          erro: 'Produto não encontrado.',
        })
      }

      const produto = mapProduto(
        atual.rows[0],
      )

      const nome =
        req.body.nome === undefined
          ? produto.nome
          : texto(req.body.nome)

      const codigoBarras =
        req.body.codigoBarras === undefined
          ? produto.codigoBarras
          : texto(req.body.codigoBarras)

      const preco =
        req.body.preco === undefined
          ? produto.preco
          : numero(req.body.preco)

      const custo =
        req.body.custo === undefined
          ? produto.custo
          : numero(req.body.custo)

      const estoque =
        req.body.estoque === undefined
          ? produto.estoque
          : numero(req.body.estoque)

      const estoqueMinimo =
        req.body.estoqueMinimo === undefined
          ? produto.estoqueMinimo
          : numero(
              req.body.estoqueMinimo,
            )

      const fornecedor =
        req.body.fornecedor === undefined
          ? produto.fornecedor
          : texto(req.body.fornecedor)

      const fornecedorId =
        req.body.fornecedorId === undefined
          ? produto.fornecedorId
          : inteiroOuNull(
              req.body.fornecedorId,
            )

      const categoria =
        req.body.categoria === undefined
          ? produto.categoria
          : texto(req.body.categoria)

      const ncm =
        req.body.ncm === undefined
          ? produto.ncm
          : texto(req.body.ncm)

      const cest =
        req.body.cest === undefined
          ? produto.cest
          : texto(req.body.cest)

      const origemMercadoria =
        req.body.origemMercadoria === undefined
          ? produto.origemMercadoria
          : texto(req.body.origemMercadoria)

      const cstIcms =
        req.body.cstIcms === undefined
          ? produto.cstIcms
          : texto(req.body.cstIcms)

      const csosn =
        req.body.csosn === undefined
          ? produto.csosn
          : texto(req.body.csosn)

      const cfop =
        req.body.cfop === undefined
          ? produto.cfop
          : texto(req.body.cfop)

      const cstIbsCbs =
        req.body.cstIbsCbs === undefined
          ? produto.cstIbsCbs
          : texto(req.body.cstIbsCbs)

      const cclassTrib =
        req.body.cclassTrib === undefined
          ? produto.cclassTrib
          : texto(req.body.cclassTrib)

      const cstPis =
        req.body.cstPis === undefined
          ? produto.cstPis
          : texto(req.body.cstPis)

      const aliquotaPis =
        req.body.aliquotaPis === undefined
          ? produto.aliquotaPis
          : req.body.aliquotaPis === '' ||
              req.body.aliquotaPis == null
            ? null
            : Number(req.body.aliquotaPis)

      const cstCofins =
        req.body.cstCofins === undefined
          ? produto.cstCofins
          : texto(req.body.cstCofins)

      const aliquotaCofins =
        req.body.aliquotaCofins === undefined
          ? produto.aliquotaCofins
          : req.body.aliquotaCofins === '' ||
              req.body.aliquotaCofins == null
            ? null
            : Number(req.body.aliquotaCofins)

      const aliquotaIcms =
        req.body.aliquotaIcms === undefined
          ? produto.aliquotaIcms
          : req.body.aliquotaIcms === '' ||
              req.body.aliquotaIcms == null
            ? null
            : Number(req.body.aliquotaIcms)

      const aliquotaIbsUf =
        req.body.aliquotaIbsUf === undefined
          ? produto.aliquotaIbsUf
          : req.body.aliquotaIbsUf === '' ||
              req.body.aliquotaIbsUf == null
            ? null
            : Number(req.body.aliquotaIbsUf)

      const aliquotaIbsMunicipal =
        req.body.aliquotaIbsMunicipal === undefined
          ? produto.aliquotaIbsMunicipal
          : req.body.aliquotaIbsMunicipal === '' ||
              req.body.aliquotaIbsMunicipal == null
            ? null
            : Number(req.body.aliquotaIbsMunicipal)

      const aliquotaCbs =
        req.body.aliquotaCbs === undefined
          ? produto.aliquotaCbs
          : req.body.aliquotaCbs === '' ||
              req.body.aliquotaCbs == null
            ? null
            : Number(req.body.aliquotaCbs)

      const unidade =
        req.body.unidade === undefined
          ? produto.unidade
          : texto(
              req.body.unidade,
            ).toUpperCase()

      const pesavel =
        req.body.pesavel === undefined
          ? produto.pesavel
          : booleano(req.body.pesavel)

      const plu =
        req.body.plu === undefined
          ? produto.plu
          : texto(req.body.plu)

      const etiquetaAtiva =
        req.body.etiquetaAtiva === undefined
          ? produto.etiquetaAtiva
          : booleano(
              req.body.etiquetaAtiva,
            )

      const ativo =
        req.body.ativo === undefined
          ? produto.ativo
          : booleano(req.body.ativo)

      const clubeAtivo =
        req.body.clubeAtivo === undefined
          ? produto.clubeAtivo
          : booleano(
              req.body.clubeAtivo,
            )

      const precoClube =
        req.body.precoClube === undefined
          ? produto.precoClube
          : req.body.precoClube === '' ||
              req.body.precoClube == null
            ? null
            : numero(
                req.body.precoClube,
              )

      if (!nome) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          erro:
            'Nome do produto é obrigatório.',
        })
      }

      if (!codigoBarras && !plu) {
        await client.query('ROLLBACK')
        return res.status(400).json({
          erro:
            'Informe código de barras ou PLU.',
        })
      }

      if (
        [
          preco,
          custo,
          estoque,
          estoqueMinimo,
        ].some(
          (valor) =>
            valor === null ||
            valor < 0,
        )
      ) {
        await client.query('ROLLBACK')

        return res.status(400).json({
          erro:
            'Valores numéricos inválidos.',
        })
      }

      if (!validarUnidade(unidade)) {
        await client.query('ROLLBACK')

        return res.status(400).json({
          erro:
            'Unidade de medida inválida.',
        })
      }

      if (pesavel && !plu) {
        await client.query('ROLLBACK')

        return res.status(400).json({
          erro:
            'Produto pesável precisa possuir PLU.',
        })
      }

      if (
        clubeAtivo &&
        (
          precoClube === null ||
          precoClube < 0
        )
      ) {
        await client.query('ROLLBACK')

        return res.status(400).json({
          erro:
            'Informe um preço Clube válido.',
        })
      }

      const fornecedorEncontrado =
        await fornecedorValido(
          fornecedorId,
          req.usuario.empresaId,
        )

      if (fornecedorEncontrado === false) {
        await client.query('ROLLBACK')

        return res.status(400).json({
          erro:
            'Fornecedor não pertence à empresa.',
        })
      }

      const nomeFornecedor =
        fornecedorEncontrado
          ? fornecedorEncontrado.nome
          : fornecedor

      const estoqueAnterior =
        Number(produto.estoque)

      const resultado =
        await client.query(
          `
          UPDATE produtos
          SET
            nome = $1,
            codigo_barras = $2,
            preco = $3,
            custo = $4,
            estoque = $5,
            estoque_minimo = $6,
            fornecedor = $7,
            fornecedor_id = $8,
            categoria = $9,
            ncm = $10,
            cest = $11,
            origem_mercadoria = $12,
            cst_icms = $13,
            csosn = $14,
            cfop = $15,
            cst_ibs_cbs = $16,
            cclass_trib = $17,
            cst_pis = $18,
            aliquota_pis = $19,
            cst_cofins = $20,
            aliquota_cofins = $21,
            aliquota_icms = $22,
            aliquota_ibs_uf = $23,
            aliquota_ibs_municipal = $24,
            aliquota_cbs = $25,
            unidade = $26,
            pesavel = $27,
            plu = $28,
            etiqueta_ativa = $29,
            ativo = $30,
            clube_ativo = $31,
            preco_clube = $32,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $33
            AND empresa_id = $34
          RETURNING *
          `,
          [
            nome,
            codigoBarras || null,
            preco,
            custo,
            estoque,
            estoqueMinimo,
            nomeFornecedor,
            fornecedorId,
            categoria,
            ncm || null,
            cest || null,
            origemMercadoria || null,
            cstIcms || null,
            csosn || null,
            cfop || null,
            cstIbsCbs || null,
            cclassTrib || null,
            cstPis || null,
            aliquotaPis,
            cstCofins || null,
            aliquotaCofins,
            aliquotaIcms,
            aliquotaIbsUf,
            aliquotaIbsMunicipal,
            aliquotaCbs,
            unidade,
            pesavel,
            plu || null,
            etiquetaAtiva,
            ativo,
            clubeAtivo,
            precoClube,
            req.params.id,
            req.usuario.empresaId,
          ],
        )

      // se estoque mudou pelo cadastro,
      // registra rastreabilidade
      if (estoque !== estoqueAnterior) {
        await client.query(
          `
          INSERT INTO movimentacoes_estoque (
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
          VALUES (
            $1,$2,$3,'ajuste',
            $4,$5,$6,
            'EDIÇÃO PRODUTO',
            'Alteração pelo cadastro'
          )
          `,
          [
            req.usuario.empresaId,
            req.params.id,
            req.usuario.id,
            Math.abs(
              estoque -
              estoqueAnterior,
            ),
            estoqueAnterior,
            estoque,
          ],
        )
      }

      await client.query('COMMIT')

      return res.status(200).json({
        mensagem:
          'Produto atualizado com sucesso.',
        produto: mapProduto(
          resultado.rows[0],
        ),
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      if (erro.code === '23505') {
        return res.status(409).json({
          erro:
            'Código de barras ou PLU já cadastrado.',
        })
      }

      console.error(
        'Erro ao atualizar produto:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível atualizar o produto.',
      })
    } finally {
      client.release()
    }
  },
)

// ======================================================
// EXCLUIR
// ======================================================

router.delete(
  '/:id',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        DELETE FROM produtos
        WHERE id = $1
          AND empresa_id = $2
        RETURNING id
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Produto não encontrado.',
        })
      }

      return res.status(200).json({
        mensagem:
          'Produto excluído com sucesso.',
      })
    } catch (erro) {
      if (erro.code === '23503') {
        return res.status(409).json({
          erro:
            'Produto possui movimentações e não pode ser excluído. Desative o produto.',
        })
      }

      console.error(
        'Erro ao excluir produto:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível excluir o produto.',
      })
    }
  },
)

module.exports = router
