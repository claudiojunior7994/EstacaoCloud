const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function texto(valor) {
  return String(valor || '').trim()
}

function mapCliente(r) {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    nome: r.nome,
    cpfCnpj: r.cpf_cnpj,
    telefone: r.telefone,
    email: r.email || '',
    nascimento: r.nascimento
      ? String(r.nascimento).slice(0, 10)
      : '',
    clube: Boolean(r.clube),
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
        FROM clientes
        WHERE empresa_id = $1
        ORDER BY nome
        `,
        [req.usuario.empresaId],
      )

      return res.status(200).json({
        clientes: resultado.rows.map(mapCliente),
      })
    } catch (erro) {
      console.error(
        'Erro ao listar clientes:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar os clientes.',
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
      const cpfCnpj = texto(req.body.cpfCnpj)
      const telefone = texto(req.body.telefone)

      const email = texto(
        req.body.email,
      ).toLowerCase()

      const nascimento = texto(
        req.body.nascimento,
      )

      const clube = Boolean(req.body.clube)
      const ativo = req.body.ativo !== false

      if (!nome || !cpfCnpj || !telefone) {
        return res.status(400).json({
          erro: 'Nome, CPF/CNPJ e telefone são obrigatórios.',
        })
      }

      const resultado = await pool.query(
        `
        INSERT INTO clientes (
          empresa_id,
          nome,
          cpf_cnpj,
          telefone,
          email,
          nascimento,
          clube,
          ativo
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          NULLIF($6, '')::date,
          $7,
          $8
        )
        RETURNING *
        `,
        [
          req.usuario.empresaId,
          nome,
          cpfCnpj,
          telefone,
          email,
          nascimento,
          clube,
          ativo,
        ],
      )

      return res.status(201).json({
        mensagem:
          'Cliente cadastrado com sucesso.',
        cliente: mapCliente(resultado.rows[0]),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um cliente com esse CPF/CNPJ.',
        })
      }

      if (erro.code === '22007') {
        return res.status(400).json({
          erro: 'Data de nascimento inválida.',
        })
      }

      console.error('Erro ao criar cliente:', erro)

      return res.status(500).json({
        erro: 'Não foi possível cadastrar o cliente.',
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
        FROM clientes
        WHERE id = $1
          AND empresa_id = $2
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!atual.rows[0]) {
        return res.status(404).json({
          erro: 'Cliente não encontrado.',
        })
      }

      const cliente = mapCliente(atual.rows[0])

      const nome =
        req.body.nome === undefined
          ? cliente.nome
          : texto(req.body.nome)

      const cpfCnpj =
        req.body.cpfCnpj === undefined
          ? cliente.cpfCnpj
          : texto(req.body.cpfCnpj)

      const telefone =
        req.body.telefone === undefined
          ? cliente.telefone
          : texto(req.body.telefone)

      const email =
        req.body.email === undefined
          ? cliente.email
          : texto(req.body.email).toLowerCase()

      const nascimento =
        req.body.nascimento === undefined
          ? cliente.nascimento
          : texto(req.body.nascimento)

      const clube =
        req.body.clube === undefined
          ? cliente.clube
          : Boolean(req.body.clube)

      const ativo =
        req.body.ativo === undefined
          ? cliente.ativo
          : Boolean(req.body.ativo)

      if (!nome || !cpfCnpj || !telefone) {
        return res.status(400).json({
          erro: 'Nome, CPF/CNPJ e telefone são obrigatórios.',
        })
      }

      const resultado = await pool.query(
        `
        UPDATE clientes
        SET
          nome = $1,
          cpf_cnpj = $2,
          telefone = $3,
          email = $4,
          nascimento = NULLIF($5, '')::date,
          clube = $6,
          ativo = $7,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $8
          AND empresa_id = $9
        RETURNING *
        `,
        [
          nome,
          cpfCnpj,
          telefone,
          email,
          nascimento,
          clube,
          ativo,
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      return res.status(200).json({
        mensagem:
          'Cliente atualizado com sucesso.',
        cliente: mapCliente(resultado.rows[0]),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um cliente com esse CPF/CNPJ.',
        })
      }

      if (erro.code === '22007') {
        return res.status(400).json({
          erro: 'Data de nascimento inválida.',
        })
      }

      console.error(
        'Erro ao atualizar cliente:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível atualizar o cliente.',
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
        DELETE FROM clientes
        WHERE id = $1
          AND empresa_id = $2
        RETURNING id
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Cliente não encontrado.',
        })
      }

      return res.status(200).json({
        mensagem:
          'Cliente excluído com sucesso.',
      })
    } catch (erro) {
      if (erro.code === '23503') {
        return res.status(409).json({
          erro: 'Cliente possui vendas vinculadas e não pode ser excluído.',
        })
      }

      console.error(
        'Erro ao excluir cliente:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível excluir o cliente.',
      })
    }
  },
)

module.exports = router