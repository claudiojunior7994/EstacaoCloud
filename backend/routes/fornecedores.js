const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function texto(valor) {
  return String(valor || '').trim()
}

function mapFornecedor(r) {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    nome: r.nome,
    cnpj: r.cnpj || '',
    telefone: r.telefone || '',
    email: r.email || '',
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
        FROM fornecedores
        WHERE empresa_id = $1
        ORDER BY nome
        `,
        [req.usuario.empresaId],
      )

      return res.status(200).json({
        fornecedores:
          resultado.rows.map(mapFornecedor),
      })
    } catch (erro) {
      console.error(
        'Erro ao listar fornecedores:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar os fornecedores.',
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
      const cnpj = texto(req.body.cnpj)
      const telefone = texto(req.body.telefone)
      const email = texto(
        req.body.email,
      ).toLowerCase()

      if (!nome) {
        return res.status(400).json({
          erro: 'Nome do fornecedor é obrigatório.',
        })
      }

      const resultado = await pool.query(
        `
        INSERT INTO fornecedores (
          empresa_id,
          nome,
          cnpj,
          telefone,
          email,
          ativo
        )
        VALUES (
          $1,
          $2,
          NULLIF($3, ''),
          $4,
          $5,
          TRUE
        )
        RETURNING *
        `,
        [
          req.usuario.empresaId,
          nome,
          cnpj,
          telefone,
          email,
        ],
      )

      return res.status(201).json({
        mensagem:
          'Fornecedor cadastrado com sucesso.',
        fornecedor: mapFornecedor(
          resultado.rows[0],
        ),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um fornecedor com esse CNPJ.',
        })
      }

      console.error(
        'Erro ao criar fornecedor:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível cadastrar o fornecedor.',
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
        FROM fornecedores
        WHERE id = $1
          AND empresa_id = $2
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!atual.rows[0]) {
        return res.status(404).json({
          erro: 'Fornecedor não encontrado.',
        })
      }

      const fornecedor = mapFornecedor(
        atual.rows[0],
      )

      const nome =
        req.body.nome === undefined
          ? fornecedor.nome
          : texto(req.body.nome)

      const cnpj =
        req.body.cnpj === undefined
          ? fornecedor.cnpj
          : texto(req.body.cnpj)

      const telefone =
        req.body.telefone === undefined
          ? fornecedor.telefone
          : texto(req.body.telefone)

      const email =
        req.body.email === undefined
          ? fornecedor.email
          : texto(req.body.email).toLowerCase()

      const ativo =
        req.body.ativo === undefined
          ? fornecedor.ativo
          : Boolean(req.body.ativo)

      if (!nome) {
        return res.status(400).json({
          erro: 'Nome do fornecedor é obrigatório.',
        })
      }

      const resultado = await pool.query(
        `
        UPDATE fornecedores
        SET
          nome = $1,
          cnpj = NULLIF($2, ''),
          telefone = $3,
          email = $4,
          ativo = $5,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $6
          AND empresa_id = $7
        RETURNING *
        `,
        [
          nome,
          cnpj,
          telefone,
          email,
          ativo,
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      return res.status(200).json({
        mensagem:
          'Fornecedor atualizado com sucesso.',
        fornecedor: mapFornecedor(
          resultado.rows[0],
        ),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um fornecedor com esse CNPJ.',
        })
      }

      console.error(
        'Erro ao atualizar fornecedor:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível atualizar o fornecedor.',
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
        DELETE FROM fornecedores
        WHERE id = $1
          AND empresa_id = $2
        RETURNING id
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Fornecedor não encontrado.',
        })
      }

      return res.status(200).json({
        mensagem:
          'Fornecedor excluído com sucesso.',
      })
    } catch (erro) {
      console.error(
        'Erro ao excluir fornecedor:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível excluir o fornecedor.',
      })
    }
  },
)

module.exports = router