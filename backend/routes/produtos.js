const express = require('express')

const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

// Armazenamento temporário em memória.
// Será substituído pelo PostgreSQL.
// Os dados somem quando o backend reiniciar.
const produtos = []

let proximoId = 1

function normalizarTexto(valor) {
  return String(valor || '').trim()
}

function normalizarNumero(valor) {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return null
  }

  return numero
}

// LISTAR PRODUTOS DA EMPRESA LOGADA
router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const produtosEmpresa = produtos.filter(
      (produto) =>
        produto.empresaId === req.usuario.empresaId,
    )

    return res.status(200).json({
      produtos: produtosEmpresa,
    })
  },
)

// BUSCAR UM PRODUTO DA EMPRESA LOGADA
router.get(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const id = Number(req.params.id)

    const produto = produtos.find(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (!produto) {
      return res.status(404).json({
        erro: 'Produto não encontrado.',
      })
    }

    return res.status(200).json({
      produto,
    })
  },
)

// CRIAR PRODUTO
router.post(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const {
      nome,
      codigoBarras,
      preco,
      custo,
      estoque,
      fornecedor,
      categoria,
    } = req.body

    const nomeNormalizado = normalizarTexto(nome)
    const codigoBarrasNormalizado =
      normalizarTexto(codigoBarras)

    const precoNormalizado = normalizarNumero(preco)
    const custoNormalizado = normalizarNumero(custo)
    const estoqueNormalizado = normalizarNumero(estoque)

    if (!nomeNormalizado) {
      return res.status(400).json({
        erro: 'Nome do produto é obrigatório.',
      })
    }

    if (!codigoBarrasNormalizado) {
      return res.status(400).json({
        erro: 'Código de barras é obrigatório.',
      })
    }

    if (
      precoNormalizado === null ||
      precoNormalizado < 0
    ) {
      return res.status(400).json({
        erro: 'Preço inválido.',
      })
    }

    if (
      custoNormalizado === null ||
      custoNormalizado < 0
    ) {
      return res.status(400).json({
        erro: 'Custo inválido.',
      })
    }

    if (
      estoqueNormalizado === null ||
      estoqueNormalizado < 0
    ) {
      return res.status(400).json({
        erro: 'Estoque inválido.',
      })
    }

    const codigoJaExiste = produtos.some(
      (produto) =>
        produto.empresaId ===
          req.usuario.empresaId &&
        produto.codigoBarras ===
          codigoBarrasNormalizado,
    )

    if (codigoJaExiste) {
      return res.status(409).json({
        erro: 'Já existe um produto com esse código de barras.',
      })
    }

    const agora = new Date().toISOString()

    const produto = {
      id: proximoId++,
      empresaId: req.usuario.empresaId,
      nome: nomeNormalizado,
      codigoBarras: codigoBarrasNormalizado,
      preco: precoNormalizado,
      custo: custoNormalizado,
      estoque: estoqueNormalizado,
      fornecedor: normalizarTexto(fornecedor),
      categoria: normalizarTexto(categoria),
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    }

    produtos.push(produto)

    return res.status(201).json({
      mensagem: 'Produto cadastrado com sucesso.',
      produto,
    })
  },
)

// EDITAR PRODUTO
router.patch(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const id = Number(req.params.id)

    const produto = produtos.find(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (!produto) {
      return res.status(404).json({
        erro: 'Produto não encontrado.',
      })
    }

    const {
      nome,
      codigoBarras,
      preco,
      custo,
      estoque,
      fornecedor,
      categoria,
      ativo,
    } = req.body

    if (nome !== undefined) {
      const valor = normalizarTexto(nome)

      if (!valor) {
        return res.status(400).json({
          erro: 'Nome do produto é obrigatório.',
        })
      }

      produto.nome = valor
    }

    if (codigoBarras !== undefined) {
      const valor = normalizarTexto(codigoBarras)

      if (!valor) {
        return res.status(400).json({
          erro: 'Código de barras é obrigatório.',
        })
      }

      const codigoJaExiste = produtos.some(
        (item) =>
          item.id !== produto.id &&
          item.empresaId ===
            req.usuario.empresaId &&
          item.codigoBarras === valor,
      )

      if (codigoJaExiste) {
        return res.status(409).json({
          erro: 'Já existe um produto com esse código de barras.',
        })
      }

      produto.codigoBarras = valor
    }

    if (preco !== undefined) {
      const valor = normalizarNumero(preco)

      if (valor === null || valor < 0) {
        return res.status(400).json({
          erro: 'Preço inválido.',
        })
      }

      produto.preco = valor
    }

    if (custo !== undefined) {
      const valor = normalizarNumero(custo)

      if (valor === null || valor < 0) {
        return res.status(400).json({
          erro: 'Custo inválido.',
        })
      }

      produto.custo = valor
    }

    if (estoque !== undefined) {
      const valor = normalizarNumero(estoque)

      if (valor === null || valor < 0) {
        return res.status(400).json({
          erro: 'Estoque inválido.',
        })
      }

      produto.estoque = valor
    }

    if (fornecedor !== undefined) {
      produto.fornecedor =
        normalizarTexto(fornecedor)
    }

    if (categoria !== undefined) {
      produto.categoria =
        normalizarTexto(categoria)
    }

    if (ativo !== undefined) {
      produto.ativo = Boolean(ativo)
    }

    produto.atualizadoEm =
      new Date().toISOString()

    return res.status(200).json({
      mensagem: 'Produto atualizado com sucesso.',
      produto,
    })
  },
)

// EXCLUIR PRODUTO
router.delete(
  '/:id',
  autenticar,
  permitirPerfis('admin'),
  (req, res) => {
    const id = Number(req.params.id)

    const indice = produtos.findIndex(
      (produto) =>
        produto.id === id &&
        produto.empresaId === req.usuario.empresaId,
    )

    if (indice === -1) {
      return res.status(404).json({
        erro: 'Produto não encontrado.',
      })
    }

    produtos.splice(indice, 1)

    return res.status(200).json({
      mensagem: 'Produto excluído com sucesso.',
    })
  },
)

module.exports = router