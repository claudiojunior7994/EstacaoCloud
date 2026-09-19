const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { pool } = require('../database/db')

const router = express.Router()

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'estacaocloud-dev-secret-alterar-em-producao'

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase()

    const senha = String(req.body.senha || '')

    if (!email || !senha) {
      return res.status(400).json({
        erro: 'Informe e-mail e senha.',
      })
    }

    const resultado = await pool.query(
      `
        SELECT
          id,
          nome,
          email,
          senha_hash,
          perfil,
          ativo
        FROM plataforma_usuarios
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `,
      [email],
    )

    const usuario = resultado.rows[0]

    if (!usuario) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.',
      })
    }

    if (!usuario.ativo) {
      return res.status(403).json({
        erro: 'Usuário inativo.',
      })
    }

    const senhaValida = await bcrypt.compare(
      senha,
      usuario.senha_hash,
    )

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.',
      })
    }

    const token = jwt.sign(
      {
        sub: usuario.id,
        tipo: 'plataforma',
        perfil: usuario.perfil,
      },
      JWT_SECRET,
      {
        expiresIn: '8h',
      },
    )

    return res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    })
  } catch (erro) {
    console.error(
      'Erro no login da plataforma:',
      erro,
    )

    return res.status(500).json({
      erro: 'Erro ao realizar login.',
    })
  }
})

module.exports = router