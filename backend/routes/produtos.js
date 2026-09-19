const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function texto(v) {
  return String(v || '').trim()
}

function numero(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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
    categoria: r.categoria || '',
    clubeAtivo: Boolean(r.clube_ativo),
    precoClube:
      r.preco_clube == null
        ? null
        : Number(r.preco_clube),
    ativo: r.ativo,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  }
}

// LISTAR
router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM produtos
        WHERE empresa_id = $1
        ORDER BY nome
        `,
        [req.usuario.empresaId],
      )

      return res.status(200).json({
        produtos: resultado.rows.map(mapProduto),
      })
    } catch (erro) {
      console.error('Erro ao listar produtos:', erro)

      return res.status(500).json({
        erro: 'Não foi possível carregar os produtos.',
      })
    }
  },
)

// BUSCAR
router.get(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM produtos
        WHERE id = $1
          AND empresa_id = $2
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Produto não encontrado.',
        })
      }

      return res.status(200).json({
        produto: mapProduto(resultado.rows[0]),
      })
    } catch (erro) {
      console.error('Erro ao buscar produto:', erro)

      return res.status(500).json({
        erro: 'Não foi possível buscar o produto.',
      })
    }
  },
)

// CRIAR
router.post(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const nome = texto(req.body.nome)
      const codigoBarras = texto(req.body.codigoBarras)

      const preco = numero(req.body.preco)
      const custo = numero(req.body.custo ?? 0)
      const estoque = numero(req.body.estoque)
      const estoqueMinimo = numero(
        req.body.estoqueMinimo ?? 0,
      )

      const fornecedor = texto(req.body.fornecedor)
      const categoria = texto(req.body.categoria)

      const clubeAtivo = Boolean(
        req.body.clubeAtivo,
      )

      const precoClube =
        req.body.precoClube === '' ||
        req.body.precoClube == null
          ? null
          : numero(req.body.precoClube)

      if (!nome) {
        return res.status(400).json({
          erro: 'Nome do produto é obrigatório.',
        })
      }

      if (!codigoBarras) {
        return res.status(400).json({
          erro: 'Código de barras é obrigatório.',
        })
      }

      if (preco === null || preco < 0) {
        return res.status(400).json({
          erro: 'Preço inválido.',
        })
      }

      if (custo === null || custo < 0) {
        return res.status(400).json({
          erro: 'Custo inválido.',
        })
      }

      if (estoque === null || estoque < 0) {
        return res.status(400).json({
          erro: 'Estoque inválido.',
        })
      }

      if (
        estoqueMinimo === null ||
        estoqueMinimo < 0
      ) {
        return res.status(400).json({
          erro: 'Estoque mínimo inválido.',
        })
      }

      if (
        clubeAtivo &&
        (precoClube === null || precoClube < 0)
      ) {
        return res.status(400).json({
          erro: 'Informe um preço Clube válido.',
        })
      }

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
          categoria,
          clube_ativo,
          preco_clube,
          ativo
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, TRUE
        )
        RETURNING *
        `,
        [
          req.usuario.empresaId,
          nome,
          codigoBarras,
          preco,
          custo,
          estoque,
          estoqueMinimo,
          fornecedor,
          categoria,
          clubeAtivo,
          precoClube,
        ],
      )

      return res.status(201).json({
        mensagem:
          'Produto cadastrado com sucesso.',
        produto: mapProduto(resultado.rows[0]),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um produto com esse código de barras.',
        })
      }

      console.error('Erro ao criar produto:', erro)

      return res.status(500).json({
        erro: 'Não foi possível cadastrar o produto.',
      })
    }
  },
)

// EDITAR
router.patch(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const atual = await pool.query(
        `
        SELECT *
        FROM produtos
        WHERE id = $1
          AND empresa_id = $2
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!atual.rows[0]) {
        return res.status(404).json({
          erro: 'Produto não encontrado.',
        })
      }

      const produto = mapProduto(atual.rows[0])

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
          : numero(req.body.estoqueMinimo)

      const fornecedor =
        req.body.fornecedor === undefined
          ? produto.fornecedor
          : texto(req.body.fornecedor)

      const categoria =
        req.body.categoria === undefined
          ? produto.categoria
          : texto(req.body.categoria)

      const ativo =
        req.body.ativo === undefined
          ? produto.ativo
          : Boolean(req.body.ativo)

      const clubeAtivo =
        req.body.clubeAtivo === undefined
          ? produto.clubeAtivo
          : Boolean(req.body.clubeAtivo)

      const precoClube =
        req.body.precoClube === undefined
          ? produto.precoClube
          : req.body.precoClube === '' ||
              req.body.precoClube == null
            ? null
            : numero(req.body.precoClube)

      if (!nome || !codigoBarras) {
        return res.status(400).json({
          erro: 'Nome e código de barras são obrigatórios.',
        })
      }

      if (
        [preco, custo, estoque, estoqueMinimo].some(
          (valor) =>
            valor === null || valor < 0,
        )
      ) {
        return res.status(400).json({
          erro: 'Valores numéricos inválidos.',
        })
      }

      if (
        clubeAtivo &&
        (precoClube === null || precoClube < 0)
      ) {
        return res.status(400).json({
          erro: 'Informe um preço Clube válido.',
        })
      }

      const resultado = await pool.query(
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
          categoria = $8,
          ativo = $9,
          clube_ativo = $10,
          preco_clube = $11,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $12
          AND empresa_id = $13
        RETURNING *
        `,
        [
          nome,
          codigoBarras,
          preco,
          custo,
          estoque,
          estoqueMinimo,
          fornecedor,
          categoria,
          ativo,
          clubeAtivo,
          precoClube,
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      return res.status(200).json({
        mensagem:
          'Produto atualizado com sucesso.',
        produto: mapProduto(resultado.rows[0]),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um produto com esse código de barras.',
        })
      }

      console.error(
        'Erro ao atualizar produto:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível atualizar o produto.',
      })
    }
  },
)

// EXCLUIR
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
        [req.params.id, req.usuario.empresaId],
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
          erro: 'Produto possui movimentações e não pode ser excluído.',
        })
      }

      console.error('Erro ao excluir produto:', erro)

      return res.status(500).json({
        erro: 'Não foi possível excluir o produto.',
      })
    }
  },
)

module.exports = router