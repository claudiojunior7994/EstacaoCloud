const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { pool } = require('../database/db')

const router = express.Router()

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'estacaocloud-dev-secret-alterar-em-producao'

function autenticarPlataforma(req, res, next) {
  const cabecalho = req.headers.authorization || ''

  if (!cabecalho.startsWith('Bearer ')) {
    return res.status(401).json({
      erro: 'Token não informado.',
    })
  }

  const token = cabecalho.substring(7)

  try {
    const dados = jwt.verify(token, JWT_SECRET)

    if (dados.tipo !== 'plataforma') {
      return res.status(403).json({
        erro: 'Acesso não autorizado.',
      })
    }

    req.plataformaUsuario = {
      id: Number(dados.sub),
      perfil: dados.perfil,
    }

    return next()
  } catch {
    return res.status(401).json({
      erro: 'Token inválido ou expirado.',
    })
  }
}

function permitirPlataforma(...perfis) {
  return (req, res, next) => {
    if (
      !perfis.includes(
        req.plataformaUsuario.perfil,
      )
    ) {
      return res.status(403).json({
        erro: 'Você não possui permissão.',
      })
    }

    return next()
  }
}

async function registrarAuditoria(
  client,
  usuarioId,
  acao,
  empresaId = null,
  detalhes = null,
) {
  await client.query(
    `
      INSERT INTO plataforma_auditoria
        (usuario_id, acao, empresa_id, detalhes)
      VALUES ($1, $2, $3, $4)
    `,
    [usuarioId, acao, empresaId, detalhes],
  )
}

/*
 * =====================================================
 * EMPRESAS / CLIENTES DA ESTAÇÃO GROUP
 * =====================================================
 */

router.get(
  '/empresas',
  autenticarPlataforma,
  async (req, res) => {
    try {
      const resultado = await pool.query(`
        SELECT
          e.id,
          e.nome,
          e.nome_fantasia,
          e.cnpj,
          e.email,
          e.telefone,
          e.ativa,
          e.criada_em,
          COUNT(u.id)::INTEGER AS quantidade_usuarios
        FROM empresas e
        LEFT JOIN usuarios u
          ON u.empresa_id = e.id
        GROUP BY e.id
        ORDER BY e.id DESC
      `)

      return res.json(resultado.rows)
    } catch (erro) {
      console.error(
        'Erro ao listar empresas:',
        erro,
      )

      return res.status(500).json({
        erro: 'Erro ao listar empresas.',
      })
    }
  },
)

router.post(
  '/empresas',
  autenticarPlataforma,
  permitirPlataforma(
    'superadmin',
    'administrativo',
    'comercial',
  ),
  async (req, res) => {
    const {
      nome,
      nomeFantasia,
      cnpj,
      email,
      telefone,
      adminNome,
      adminEmail,
      adminSenha,
    } = req.body

    if (
      !String(nome || '').trim() ||
      !String(adminNome || '').trim() ||
      !String(adminEmail || '').trim() ||
      String(adminSenha || '').length < 6
    ) {
      return res.status(400).json({
        erro:
          'Informe a empresa, nome do administrador, e-mail e senha com pelo menos 6 caracteres.',
      })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const empresaResultado =
        await client.query(
          `
            INSERT INTO empresas
              (
                nome,
                nome_fantasia,
                cnpj,
                email,
                telefone,
                ativa
              )
            VALUES ($1, $2, $3, $4, $5, TRUE)
            RETURNING *
          `,
          [
            String(nome).trim(),
            String(nomeFantasia || '').trim() ||
              null,
            String(cnpj || '').trim() || null,
            String(email || '')
              .trim()
              .toLowerCase() || null,
            String(telefone || '').trim() ||
              null,
          ],
        )

      const empresa = empresaResultado.rows[0]

      const senhaHash = await bcrypt.hash(
        String(adminSenha),
        12,
      )

      const usuarioResultado =
        await client.query(
          `
            INSERT INTO usuarios
              (
                empresa_id,
                nome,
                email,
                senha_hash,
                perfil,
                ativo
              )
            VALUES ($1, $2, $3, $4, 'admin', TRUE)
            RETURNING
              id,
              empresa_id,
              nome,
              email,
              perfil,
              ativo,
              criado_em
          `,
          [
            empresa.id,
            String(adminNome).trim(),
            String(adminEmail)
              .trim()
              .toLowerCase(),
            senhaHash,
          ],
        )

      await registrarAuditoria(
        client,
        req.plataformaUsuario.id,
        'EMPRESA_CRIADA',
        empresa.id,
        `Empresa ${empresa.nome} cadastrada.`,
      )

      await client.query('COMMIT')

      return res.status(201).json({
        mensagem:
          'Empresa cadastrada com sucesso.',
        empresa,
        administrador:
          usuarioResultado.rows[0],
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      console.error(
        'Erro ao cadastrar empresa:',
        erro,
      )

      if (erro.code === '23505') {
        return res.status(409).json({
          erro:
            'CNPJ ou e-mail já cadastrado.',
        })
      }

      return res.status(500).json({
        erro: 'Erro ao cadastrar empresa.',
      })
    } finally {
      client.release()
    }
  },
)

router.patch(
  '/empresas/:id/status',
  autenticarPlataforma,
  permitirPlataforma(
    'superadmin',
    'administrativo',
  ),
  async (req, res) => {
    try {
      const id = Number(req.params.id)
      const ativa = Boolean(req.body.ativa)

      const resultado = await pool.query(
        `
          UPDATE empresas
          SET
            ativa = $1,
            atualizada_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
        `,
        [ativa, id],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Empresa não encontrada.',
        })
      }

      await pool.query(
        `
          INSERT INTO plataforma_auditoria
            (
              usuario_id,
              acao,
              empresa_id,
              detalhes
            )
          VALUES ($1, $2, $3, $4)
        `,
        [
          req.plataformaUsuario.id,
          ativa
            ? 'EMPRESA_ATIVADA'
            : 'EMPRESA_INATIVADA',
          id,
          ativa
            ? 'Empresa ativada.'
            : 'Empresa inativada.',
        ],
      )

      return res.json(resultado.rows[0])
    } catch (erro) {
      console.error(
        'Erro ao alterar empresa:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Erro ao alterar status da empresa.',
      })
    }
  },
)

/*
 * =====================================================
 * EQUIPE ESTAÇÃO GROUP
 * =====================================================
 */

router.get(
  '/equipe',
  autenticarPlataforma,
  permitirPlataforma(
    'superadmin',
    'administrativo',
  ),
  async (req, res) => {
    try {
      const resultado = await pool.query(`
        SELECT
          id,
          nome,
          email,
          perfil,
          ativo,
          criado_em,
          atualizado_em
        FROM plataforma_usuarios
        ORDER BY id
      `)

      return res.json(resultado.rows)
    } catch (erro) {
      return res.status(500).json({
        erro: 'Erro ao carregar equipe.',
      })
    }
  },
)

router.post(
  '/equipe',
  autenticarPlataforma,
  permitirPlataforma('superadmin'),
  async (req, res) => {
    try {
      const nome = String(
        req.body.nome || '',
      ).trim()

      const email = String(
        req.body.email || '',
      )
        .trim()
        .toLowerCase()

      const senha = String(
        req.body.senha || '',
      )

      const perfil = String(
        req.body.perfil || '',
      ).trim()

      const perfisPermitidos = [
        'administrativo',
        'comercial',
        'suporte',
        'tecnico',
      ]

      if (
        !nome ||
        !email ||
        senha.length < 6 ||
        !perfisPermitidos.includes(perfil)
      ) {
        return res.status(400).json({
          erro:
            'Dados do funcionário inválidos.',
        })
      }

      const senhaHash = await bcrypt.hash(
        senha,
        12,
      )

      const resultado = await pool.query(
        `
          INSERT INTO plataforma_usuarios
            (
              nome,
              email,
              senha_hash,
              perfil,
              ativo
            )
          VALUES ($1, $2, $3, $4, TRUE)
          RETURNING
            id,
            nome,
            email,
            perfil,
            ativo,
            criado_em
        `,
        [nome, email, senhaHash, perfil],
      )

      await pool.query(
        `
          INSERT INTO plataforma_auditoria
            (usuario_id, acao, detalhes)
          VALUES ($1, 'FUNCIONARIO_CRIADO', $2)
        `,
        [
          req.plataformaUsuario.id,
          `Funcionário ${nome} cadastrado.`,
        ],
      )

      return res
        .status(201)
        .json(resultado.rows[0])
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'E-mail já cadastrado.',
        })
      }

      console.error(
        'Erro ao cadastrar funcionário:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Erro ao cadastrar funcionário.',
      })
    }
  },
)

router.patch(
  '/equipe/:id/status',
  autenticarPlataforma,
  permitirPlataforma('superadmin'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)

      if (
        id === req.plataformaUsuario.id &&
        req.body.ativo === false
      ) {
        return res.status(400).json({
          erro:
            'Você não pode inativar seu próprio usuário.',
        })
      }

      const resultado = await pool.query(
        `
          UPDATE plataforma_usuarios
          SET
            ativo = $1,
            atualizado_em = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING
            id,
            nome,
            email,
            perfil,
            ativo
        `,
        [Boolean(req.body.ativo), id],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro:
            'Funcionário não encontrado.',
        })
      }

      return res.json(resultado.rows[0])
    } catch (erro) {
      return res.status(500).json({
        erro:
          'Erro ao alterar funcionário.',
      })
    }
  },
)

router.get(
  '/auditoria',
  autenticarPlataforma,
  permitirPlataforma(
    'superadmin',
    'administrativo',
  ),
  async (req, res) => {
    try {
      const resultado = await pool.query(`
        SELECT
          a.id,
          a.acao,
          a.empresa_id,
          a.detalhes,
          a.criado_em,
          p.nome AS usuario_nome
        FROM plataforma_auditoria a
        LEFT JOIN plataforma_usuarios p
          ON p.id = a.usuario_id
        ORDER BY a.id DESC
        LIMIT 500
      `)

      return res.json(resultado.rows)
    } catch (erro) {
      return res.status(500).json({
        erro:
          'Erro ao carregar auditoria.',
      })
    }
  },
)

module.exports = router