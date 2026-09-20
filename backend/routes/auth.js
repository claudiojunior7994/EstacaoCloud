const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { pool } = require('../database/db')

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET não configurado. Defina a variável no arquivo .env.'
  )
}

function gerarToken(usuario) {
  return jwt.sign(
    {
      sub: usuario.id,
      empresaId: usuario.empresaId,
      perfil: usuario.perfil,
      tipo: 'cliente',
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    },
  )
}

function respostaLogin(res, usuario, token) {
  return res.status(200).json({
    mensagem: 'Login realizado com sucesso.',
    usuario: {
      id: usuario.id,
      empresaId: usuario.empresaId,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
    },
    token,
  })
}

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()

    const senha = String(req.body.senha || '')

    if (!email || !senha) {
      return res.status(400).json({
        erro: 'E-mail e senha são obrigatórios.',
      })
    }

    const resultado = await pool.query(
      `
        SELECT
          u.id,
          u.empresa_id,
          u.nome,
          u.email,
          u.senha_hash,
          u.perfil,
          u.ativo AS usuario_ativo,
          e.ativa AS empresa_ativa,
          e.nome AS empresa_nome,
          e.nome_fantasia AS empresa_nome_fantasia
        FROM usuarios u
        INNER JOIN empresas e
          ON e.id = u.empresa_id
        WHERE LOWER(u.email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    )

    const registro = resultado.rows[0]

    if (!registro) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.',
      })
    }

    if (!registro.empresa_ativa) {
      return res.status(403).json({
        erro: 'Empresa inativa. Entre em contato com a Estação Group.',
      })
    }

    if (!registro.usuario_ativo) {
      return res.status(403).json({
        erro: 'Usuário inativo. Procure o administrador.',
      })
    }

    const senhaValida = await bcrypt.compare(
      senha,
      registro.senha_hash,
    )

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.',
      })
    }

    const usuario = {
      id: registro.id,
      empresaId: registro.empresa_id,
      nome: registro.nome,
      email: registro.email,
      perfil: registro.perfil,
    }

    const token = gerarToken(usuario)

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      usuario: {
        ...usuario,
        empresa: {
          id: registro.empresa_id,
          nome:
            registro.empresa_nome_fantasia ||
            registro.empresa_nome,
        },
      },
      token,
    })
  } catch (erro) {
    console.error('Erro no login do EstacaoCloud:', erro)

    return res.status(500).json({
      erro: 'Erro interno no login.',
    })
  }
})

module.exports = router