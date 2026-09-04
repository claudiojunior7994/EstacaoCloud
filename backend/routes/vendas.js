const express = require('express')

const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const {
  produtos,
} = require('../data/produtosStore')

const router = express.Router()

const vendas = []
let proximoId = 1

function numero(valor) {
  const convertido = Number(valor)

  if (!Number.isFinite(convertido)) {
    return null
  }

  return convertido
}

router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const vendasEmpresa = vendas.filter(
      (venda) =>
        venda.empresaId === req.usuario.empresaId,
    )

    return res.status(200).json({
      vendas: vendasEmpresa,
    })
  },
)

router.post(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const {
      itens,
      clienteId,
      formaPagamento,
      desconto = 0,
    } = req.body

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        erro: 'A venda precisa possuir pelo menos um item.',
      })
    }

    const itensNormalizados = []

    for (const item of itens) {
      const produtoId = numero(item.produtoId)
      const quantidade = numero(item.quantidade)

      if (
        produtoId === null ||
        quantidade === null ||
        quantidade <= 0
      ) {
        return res.status(400).json({
          erro: 'Existe um item inválido na venda.',
        })
      }

      const produto = produtos.find(
        (produtoAtual) =>
          produtoAtual.id === produtoId &&
          produtoAtual.empresaId === req.usuario.empresaId,
      )

      if (!produto) {
        return res.status(404).json({
          erro: `Produto ${produtoId} não encontrado.`,
        })
      }

      if (produto.ativo === false) {
        return res.status(400).json({
          erro: `O produto "${produto.nome}" está inativo.`,
        })
      }

      if (quantidade > produto.estoque) {
        return res.status(409).json({
          erro: `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}.`,
        })
      }

      const precoUnitario = Number(produto.preco)

      itensNormalizados.push({
        produtoId: produto.id,
        nome: produto.nome,
        quantidade,
        precoUnitario,
        subtotal: quantidade * precoUnitario,
      })
    }

    const subtotal = itensNormalizados.reduce(
      (total, item) => total + item.subtotal,
      0,
    )

    const descontoNormalizado = numero(desconto)

    if (
      descontoNormalizado === null ||
      descontoNormalizado < 0 ||
      descontoNormalizado > subtotal
    ) {
      return res.status(400).json({
        erro: 'Desconto inválido.',
      })
    }

    const pagamento = String(
      formaPagamento || '',
    ).trim()

    if (!pagamento) {
      return res.status(400).json({
        erro: 'Informe a forma de pagamento.',
      })
    }

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

    const agora = new Date().toISOString()

    // Baixa o estoque somente depois de validar
    // todos os itens da venda.
    for (const itemVenda of itensNormalizados) {
      const produto = produtos.find(
        (produtoAtual) =>
          produtoAtual.id === itemVenda.produtoId &&
          produtoAtual.empresaId === req.usuario.empresaId,
      )

      produto.estoque -= itemVenda.quantidade
      produto.atualizadoEm = agora
    }

    const venda = {
      id: proximoId++,
      empresaId: req.usuario.empresaId,
      usuarioId: req.usuario.id,
      clienteId: clienteId
        ? Number(clienteId)
        : null,
      itens: itensNormalizados,
      subtotal,
      desconto: descontoNormalizado,
      total: subtotal - descontoNormalizado,
      formaPagamento: pagamento,
      status: 'concluida',
      criadaEm: agora,
    }

    vendas.unshift(venda)

    return res.status(201).json({
      mensagem: 'Venda realizada com sucesso.',
      venda,
    })
  },
)

router.get(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const id = Number(req.params.id)

    const venda = vendas.find(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (!venda) {
      return res.status(404).json({
        erro: 'Venda não encontrada.',
      })
    }

    return res.status(200).json({
      venda,
    })
  },
)

router.patch(
  '/:id/cancelar',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const id = Number(req.params.id)

    const venda = vendas.find(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (!venda) {
      return res.status(404).json({
        erro: 'Venda não encontrada.',
      })
    }

    if (venda.status === 'cancelada') {
      return res.status(409).json({
        erro: 'Esta venda já está cancelada.',
      })
    }

    const agora = new Date().toISOString()

    // Devolve os itens ao estoque.
    for (const itemVenda of venda.itens) {
      const produto = produtos.find(
        (produtoAtual) =>
          produtoAtual.id === itemVenda.produtoId &&
          produtoAtual.empresaId === req.usuario.empresaId,
      )

      if (produto) {
        produto.estoque += itemVenda.quantidade
        produto.atualizadoEm = agora
      }
    }

    venda.status = 'cancelada'
    venda.canceladaEm = agora
    venda.canceladaPor = req.usuario.id

    return res.status(200).json({
      mensagem: 'Venda cancelada com sucesso.',
      venda,
    })
  },
)

module.exports = router