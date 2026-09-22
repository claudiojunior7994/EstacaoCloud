const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')
const { processarTef } = require('../services/tef')

const router = express.Router()

router.get('/configuracao', autenticar, async (req, res) => {
  try {
    const empresa = await pool.query(
      `
      SELECT
        tef_habilitado,
        tef_modo,
        tef_provedor
      FROM empresas
      WHERE id = $1
      `,
      [req.usuario.empresaId],
    )

    if (!empresa.rows[0]) {
      return res.status(404).json({
        erro: 'Empresa não encontrada.',
      })
    }

    const terminais = await pool.query(
      `
      SELECT
        id,
        terminal,
        identificador_tef,
        ativo
      FROM tef_terminais
      WHERE empresa_id = $1
      ORDER BY terminal
      `,
      [req.usuario.empresaId],
    )

    res.json({
      configuracao: {
        habilitado: empresa.rows[0].tef_habilitado,
        modo: empresa.rows[0].tef_modo,
        provedor: empresa.rows[0].tef_provedor,
        terminais: terminais.rows,
      },
    })
  } catch (erro) {
    console.error(erro)
    res.status(500).json({
      erro: 'Erro ao carregar configuração TEF.',
    })
  }
})

router.patch(
  '/configuracao',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const habilitado = Boolean(req.body.habilitado)
      const modo = String(
        req.body.modo || 'simulacao',
      ).trim()

      const provedor = String(
        req.body.provedor || '',
      ).trim()

      if (!['simulacao', 'producao'].includes(modo)) {
        return res.status(400).json({
          erro: 'Modo TEF inválido.',
        })
      }

      await pool.query(
        `
        UPDATE empresas
        SET
          tef_habilitado = $1,
          tef_modo = $2,
          tef_provedor = $3,
          atualizada_em = CURRENT_TIMESTAMP
        WHERE id = $4
        `,
        [
          habilitado,
          modo,
          provedor || null,
          req.usuario.empresaId,
        ],
      )

      res.json({
        mensagem: 'Configuração TEF salva.',
      })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({
        erro: 'Erro ao salvar configuração TEF.',
      })
    }
  },
)

router.put(
  '/terminais/:terminal',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const terminal = String(
        req.params.terminal || '',
      ).trim()

      const identificador = String(
        req.body.identificadorTef || '',
      ).trim()

      const ativo =
        req.body.ativo === undefined
          ? true
          : Boolean(req.body.ativo)

      if (!terminal) {
        return res.status(400).json({
          erro: 'Terminal é obrigatório.',
        })
      }

      const resultado = await pool.query(
        `
        INSERT INTO tef_terminais (
          empresa_id,
          terminal,
          identificador_tef,
          ativo
        )
        VALUES ($1, $2, $3, $4)

        ON CONFLICT (empresa_id, terminal)
        DO UPDATE SET
          identificador_tef =
            EXCLUDED.identificador_tef,
          ativo = EXCLUDED.ativo,
          atualizada_em = CURRENT_TIMESTAMP

        RETURNING *
        `,
        [
          req.usuario.empresaId,
          terminal,
          identificador || null,
          ativo,
        ],
      )

      res.json({
        mensagem: 'Terminal TEF salvo.',
        terminal: resultado.rows[0],
      })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({
        erro: 'Erro ao salvar terminal TEF.',
      })
    }
  },
)

router.post('/transacoes', autenticar, async (req, res) => {
  const client = await pool.connect()

  try {
    const terminal = String(
      req.body.terminal || '',
    ).trim()

    const tipo = String(req.body.tipo || '')
      .trim()
      .toLowerCase()

    const valor = Number(req.body.valor)

    if (!terminal) {
      return res.status(400).json({
        erro: 'Terminal é obrigatório.',
      })
    }

    if (!['debito', 'credito'].includes(tipo)) {
      return res.status(400).json({
        erro: 'Tipo TEF inválido.',
      })
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      return res.status(400).json({
        erro: 'Valor TEF inválido.',
      })
    }

    const empresa = await client.query(
      `
      SELECT
        tef_habilitado,
        tef_modo,
        tef_provedor
      FROM empresas
      WHERE id = $1
      `,
      [req.usuario.empresaId],
    )

    if (!empresa.rows[0]?.tef_habilitado) {
      return res.status(409).json({
        erro: 'TEF não está habilitado para esta empresa.',
      })
    }

    const terminalTef = await client.query(
      `
      SELECT *
      FROM tef_terminais
      WHERE empresa_id = $1
        AND terminal = $2
        AND ativo = TRUE
      `,
      [
        req.usuario.empresaId,
        terminal,
      ],
    )

    if (!terminalTef.rows[0]) {
      return res.status(409).json({
        erro: `Terminal ${terminal} não está configurado para TEF.`,
      })
    }

    await client.query('BEGIN')

    const registro = await client.query(
      `
      INSERT INTO tef_transacoes (
        empresa_id,
        terminal,
        tipo,
        valor,
        provedor,
        modo,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'iniciada')
      RETURNING *
      `,
      [
        req.usuario.empresaId,
        terminal,
        tipo,
        valor,
        empresa.rows[0].tef_provedor,
        empresa.rows[0].tef_modo,
      ],
    )

    const transacao = registro.rows[0]

    try {
      const retorno = await processarTef({
        modo: empresa.rows[0].tef_modo,
        provedor: empresa.rows[0].tef_provedor,
        tipo,
        valor,
        terminal,
      })

      const atualizado = await client.query(
        `
        UPDATE tef_transacoes
        SET
          status = $1,
          nsu = $2,
          autorizacao = $3,
          identificador_externo = $4,
          mensagem = $5,
          atualizada_em = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
        `,
        [
          retorno.status,
          retorno.nsu || null,
          retorno.autorizacao || null,
          retorno.identificadorExterno || null,
          retorno.mensagem || null,
          transacao.id,
        ],
      )

      await client.query('COMMIT')

      return res.json({
        transacao: atualizado.rows[0],
      })
    } catch (erroTef) {
      await client.query(
        `
        UPDATE tef_transacoes
        SET
          status = 'erro',
          mensagem = $1,
          atualizada_em = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
          erroTef.message,
          transacao.id,
        ],
      )

      await client.query('COMMIT')

      return res.status(502).json({
        erro: erroTef.message,
      })
    }
  } catch (erro) {
    try {
      await client.query('ROLLBACK')
    } catch {}

    console.error(erro)

    res.status(500).json({
      erro: 'Erro ao processar transação TEF.',
    })
  } finally {
    client.release()
  }
})

module.exports = router
