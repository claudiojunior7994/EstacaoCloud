const express = require('express')

const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

// Temporário até conectarmos o PostgreSQL.
const clientes = []
let proximoId = 1

function texto(valor) {
  return String(valor || '').trim()
}

router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    return res.status(200).json({
      clientes: clientes.filter(
        (cliente) =>
          cliente.empresaId === req.usuario.empresaId,
      ),
    })
  },
)

router.post(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const nome = texto(req.body.nome)
    const cpfCnpj = texto(req.body.cpfCnpj)
    const telefone = texto(req.body.telefone)
    const email = texto(req.body.email).toLowerCase()
    const nascimento = texto(req.body.nascimento)
    const clube = Boolean(req.body.clube)
    const ativo = req.body.ativo !== false

    if (!nome) {
      return res.status(400).json({
        erro: 'Nome do cliente é obrigatório.',
      })
    }

    if (cpfCnpj) {
      const duplicado = clientes.some(
        (cliente) =>
          cliente.empresaId === req.usuario.empresaId &&
          cliente.cpfCnpj === cpfCnpj,
      )

      if (duplicado) {
        return res.status(409).json({
          erro: 'Já existe um cliente com esse CPF/CNPJ.',
        })
      }
    }

    const agora = new Date().toISOString()

    const cliente = {
      id: proximoId++,
      empresaId: req.usuario.empresaId,
      nome,
      cpfCnpj,
      telefone,
      email,
      nascimento,
      clube,
      ativo,
      criadoEm: agora,
      atualizadoEm: agora,
    }

    clientes.push(cliente)

    return res.status(201).json({
      mensagem: 'Cliente cadastrado com sucesso.',
      cliente,
    })
  },
)

router.patch(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const id = Number(req.params.id)

    const cliente = clientes.find(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (!cliente) {
      return res.status(404).json({
        erro: 'Cliente não encontrado.',
      })
    }

    if (req.body.nome !== undefined) {
      const nome = texto(req.body.nome)

      if (!nome) {
        return res.status(400).json({
          erro: 'Nome do cliente é obrigatório.',
        })
      }

      cliente.nome = nome
    }

    if (req.body.cpfCnpj !== undefined) {
      const cpfCnpj = texto(req.body.cpfCnpj)

      if (cpfCnpj) {
        const duplicado = clientes.some(
          (item) =>
            item.id !== cliente.id &&
            item.empresaId === req.usuario.empresaId &&
            item.cpfCnpj === cpfCnpj,
        )

        if (duplicado) {
          return res.status(409).json({
            erro: 'Já existe um cliente com esse CPF/CNPJ.',
          })
        }
      }

      cliente.cpfCnpj = cpfCnpj
    }

    if (req.body.telefone !== undefined) {
      cliente.telefone = texto(req.body.telefone)
    }

    if (req.body.email !== undefined) {
      cliente.email = texto(req.body.email).toLowerCase()
    }

    if (req.body.nascimento !== undefined) {
      cliente.nascimento = texto(req.body.nascimento)
    }

    if (req.body.clube !== undefined) {
      cliente.clube = Boolean(req.body.clube)
    }

    if (req.body.ativo !== undefined) {
      cliente.ativo = Boolean(req.body.ativo)
    }

    cliente.atualizadoEm = new Date().toISOString()

    return res.status(200).json({
      mensagem: 'Cliente atualizado com sucesso.',
      cliente,
    })
  },
)

router.delete(
  '/:id',
  autenticar,
  permitirPerfis('admin'),
  (req, res) => {
    const id = Number(req.params.id)

    const indice = clientes.findIndex(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (indice === -1) {
      return res.status(404).json({
        erro: 'Cliente não encontrado.',
      })
    }

    clientes.splice(indice, 1)

    return res.status(200).json({
      mensagem: 'Cliente excluído com sucesso.',
    })
  },
)

module.exports = router