const express = require('express')
const bcrypt = require('bcryptjs')

const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

const perfisPermitidos = [
  'admin',
  'gerente',
  'operador',
]

function normalizarEmail(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
}

function mapUsuario(r) {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    nome: r.nome,
    email: r.email,
    perfil: r.perfil,
    ativo: r.ativo,
    criadoEm: r.criado_em,
    atualizadoEm: r.atualizado_em,
  }
}

// LISTAR
router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT
          id,
          empresa_id,
          nome,
          email,
          perfil,
          ativo,
          criado_em,
          atualizado_em
        FROM usuarios
        WHERE empresa_id = $1
        ORDER BY nome
        `,
        [req.usuario.empresaId],
      )

      return res.status(200).json({
        empresaId: req.usuario.empresaId,
        usuarios:
          resultado.rows.map(mapUsuario),
      })
    } catch (erro) {
      console.error(
        'Erro ao listar usuários:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar os usuários.',
      })
    }
  },
)

// CRIAR
router.post(
  '/',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const nome = String(
        req.body.nome || '',
      ).trim()

      const email = normalizarEmail(
        req.body.email,
      )

      const senha = String(
        req.body.senha || '',
      )

      const perfil = req.body.perfil

      if (!nome || !email || !senha || !perfil) {
        return res.status(400).json({
          erro: 'Nome, e-mail, senha e perfil são obrigatórios.',
        })
      }

      if (!perfisPermitidos.includes(perfil)) {
        return res.status(400).json({
          erro: 'Perfil de usuário inválido.',
        })
      }

      if (senha.length < 6) {
        return res.status(400).json({
          erro: 'A senha deve ter pelo menos 6 caracteres.',
        })
      }

      const senhaHash = await bcrypt.hash(
        senha,
        10,
      )

      const resultado = await pool.query(
        `
        INSERT INTO usuarios (
          empresa_id,
          nome,
          email,
          senha_hash,
          perfil,
          ativo
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          TRUE
        )
        RETURNING
          id,
          empresa_id,
          nome,
          email,
          perfil,
          ativo,
          criado_em,
          atualizado_em
        `,
        [
          req.usuario.empresaId,
          nome,
          email,
          senhaHash,
          perfil,
        ],
      )

      return res.status(201).json({
        mensagem:
          'Usuário criado com sucesso.',
        usuario: mapUsuario(resultado.rows[0]),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um usuário com este e-mail nesta empresa.',
        })
      }

      console.error('Erro ao criar usuário:', erro)

      return res.status(500).json({
        erro: 'Não foi possível criar o usuário.',
      })
    }
  },
)

// EDITAR
router.patch(
  '/:id',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const atual = await pool.query(
        `
        SELECT *
        FROM usuarios
        WHERE id = $1
          AND empresa_id = $2
        `,
        [req.params.id, req.usuario.empresaId],
      )

      if (!atual.rows[0]) {
        return res.status(404).json({
          erro: 'Usuário não encontrado.',
        })
      }

      const usuario = atual.rows[0]

      const nome =
        req.body.nome === undefined
          ? usuario.nome
          : String(req.body.nome).trim()

      const email =
        req.body.email === undefined
          ? usuario.email
          : normalizarEmail(req.body.email)

      const perfil =
        req.body.perfil === undefined
          ? usuario.perfil
          : req.body.perfil

      if (!nome || !email) {
        return res.status(400).json({
          erro: 'Nome e e-mail são obrigatórios.',
        })
      }

      if (!perfisPermitidos.includes(perfil)) {
        return res.status(400).json({
          erro: 'Perfil de usuário inválido.',
        })
      }

      const resultado = await pool.query(
        `
        UPDATE usuarios
        SET
          nome = $1,
          email = $2,
          perfil = $3,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $4
          AND empresa_id = $5
        RETURNING
          id,
          empresa_id,
          nome,
          email,
          perfil,
          ativo,
          criado_em,
          atualizado_em
        `,
        [
          nome,
          email,
          perfil,
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      return res.status(200).json({
        mensagem:
          'Usuário atualizado com sucesso.',
        usuario: mapUsuario(resultado.rows[0]),
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Já existe um usuário com este e-mail nesta empresa.',
        })
      }

      console.error(
        'Erro ao atualizar usuário:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível atualizar o usuário.',
      })
    }
  },
)

// ATIVAR / INATIVAR
router.patch(
  '/:id/status',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      if (typeof req.body.ativo !== 'boolean') {
        return res.status(400).json({
          erro: 'Informe o status ativo como verdadeiro ou falso.',
        })
      }

      if (
        Number(req.params.id) ===
          Number(req.usuario.id) &&
        req.body.ativo === false
      ) {
        return res.status(400).json({
          erro: 'Você não pode inativar o próprio usuário.',
        })
      }

      const resultado = await pool.query(
        `
        UPDATE usuarios
        SET
          ativo = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
          AND empresa_id = $3
        RETURNING
          id,
          empresa_id,
          nome,
          email,
          perfil,
          ativo,
          criado_em,
          atualizado_em
        `,
        [
          req.body.ativo,
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Usuário não encontrado.',
        })
      }

      return res.status(200).json({
        mensagem: req.body.ativo
          ? 'Usuário ativado com sucesso.'
          : 'Usuário inativado com sucesso.',
        usuario: mapUsuario(resultado.rows[0]),
      })
    } catch (erro) {
      console.error(
        'Erro ao alterar status do usuário:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível alterar o usuário.',
      })
    }
  },
)

// REDEFINIR SENHA
router.patch(
  '/:id/senha',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const novaSenha = String(
        req.body.senha || '',
      )

      if (novaSenha.length < 6) {
        return res.status(400).json({
          erro: 'A nova senha deve ter pelo menos 6 caracteres.',
        })
      }

      const senhaHash = await bcrypt.hash(
        novaSenha,
        10,
      )

      const resultado = await pool.query(
        `
        UPDATE usuarios
        SET
          senha_hash = $1,
          atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2
          AND empresa_id = $3
        RETURNING id
        `,
        [
          senhaHash,
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Usuário não encontrado.',
        })
      }

      return res.status(200).json({
        mensagem:
          'Senha redefinida com sucesso.',
      })
    } catch (erro) {
      console.error(
        'Erro ao redefinir senha:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível redefinir a senha.',
      })
    }
  },
)

module.exports = router