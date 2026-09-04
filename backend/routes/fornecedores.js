const express = require('express')

const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

// Temporário até conectarmos o PostgreSQL.
const fornecedores = []
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
      fornecedores: fornecedores.filter(
        (fornecedor) =>
          fornecedor.empresaId === req.usuario.empresaId,
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
    const cnpj = texto(req.body.cnpj)
    const telefone = texto(req.body.telefone)
    const email = texto(req.body.email).toLowerCase()

    if (!nome) {
      return res.status(400).json({
        erro: 'Nome do fornecedor é obrigatório.',
      })
    }

    if (cnpj) {
      const duplicado = fornecedores.some(
        (fornecedor) =>
          fornecedor.empresaId === req.usuario.empresaId &&
          fornecedor.cnpj === cnpj,
      )

      if (duplicado) {
        return res.status(409).json({
          erro: 'Já existe um fornecedor com esse CNPJ.',
        })
      }
    }

    const agora = new Date().toISOString()

    const fornecedor = {
      id: proximoId++,
      empresaId: req.usuario.empresaId,
      nome,
      cnpj,
      telefone,
      email,
      ativo: true,
      criadoEm: agora,
      atualizadoEm: agora,
    }

    fornecedores.push(fornecedor)

    return res.status(201).json({
      mensagem: 'Fornecedor cadastrado com sucesso.',
      fornecedor,
    })
  },
)

router.patch(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const id = Number(req.params.id)

    const fornecedor = fornecedores.find(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (!fornecedor) {
      return res.status(404).json({
        erro: 'Fornecedor não encontrado.',
      })
    }

    if (req.body.nome !== undefined) {
      const nome = texto(req.body.nome)

      if (!nome) {
        return res.status(400).json({
          erro: 'Nome do fornecedor é obrigatório.',
        })
      }

      fornecedor.nome = nome
    }

    if (req.body.cnpj !== undefined) {
      const cnpj = texto(req.body.cnpj)

      if (cnpj) {
        const duplicado = fornecedores.some(
          (item) =>
            item.id !== fornecedor.id &&
            item.empresaId === req.usuario.empresaId &&
            item.cnpj === cnpj,
        )

        if (duplicado) {
          return res.status(409).json({
            erro: 'Já existe um fornecedor com esse CNPJ.',
          })
        }
      }

      fornecedor.cnpj = cnpj
    }

    if (req.body.telefone !== undefined) {
      fornecedor.telefone = texto(req.body.telefone)
    }

    if (req.body.email !== undefined) {
      fornecedor.email = texto(req.body.email).toLowerCase()
    }

    fornecedor.atualizadoEm = new Date().toISOString()

    return res.status(200).json({
      mensagem: 'Fornecedor atualizado com sucesso.',
      fornecedor,
    })
  },
)

router.delete(
  '/:id',
  autenticar,
  permitirPerfis('admin'),
  (req, res) => {
    const id = Number(req.params.id)

    const indice = fornecedores.findIndex(
      (item) =>
        item.id === id &&
        item.empresaId === req.usuario.empresaId,
    )

    if (indice === -1) {
      return res.status(404).json({
        erro: 'Fornecedor não encontrado.',
      })
    }

    fornecedores.splice(indice, 1)

    return res.status(200).json({
      mensagem: 'Fornecedor excluído com sucesso.',
    })
  },
)

module.exports = router