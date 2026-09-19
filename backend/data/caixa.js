const express = require('express')

const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function numero(valor) {
  const convertido = Number(valor)

  if (!Number.isFinite(convertido)) {
    return null
  }

  return convertido
}

function mapCaixa(r) {
  if (!r) return null

  return {
    id: r.id,
    empresaId: r.empresa_id,
    terminal: r.terminal,
    usuarioAberturaId: r.usuario_abertura_id,

    valorInicial: Number(r.valor_inicial || 0),

    vendasDinheiro: Number(r.vendas_dinheiro || 0),
    vendasPix: Number(r.vendas_pix || 0),
    vendasDebito: Number(r.vendas_debito || 0),
    vendasCredito: Number(r.vendas_credito || 0),

    sangrias: Number(r.sangrias || 0),

    status: r.status,
    abertoEm: r.aberto_em,

    fechadoEm: r.fechado_em,
    usuarioFechamentoId:
      r.usuario_fechamento_id,

    valorInformadoFechamento:
      r.valor_informado_fechamento == null
        ? null
        : Number(r.valor_informado_fechamento),

    saldoTeorico:
      r.saldo_teorico == null
        ? null
        : Number(r.saldo_teorico),

    diferenca:
      r.diferenca == null
        ? null
        : Number(r.diferenca),
  }
}

function mapMovimento(r) {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    caixaId: r.caixa_id,
    terminal: r.terminal,
    tipo: r.tipo,
    valor: Number(r.valor || 0),
    usuarioId: r.usuario_id,
    descricao: r.descricao || '',
    criadoEm: r.criado_em,
  }
}

// STATUS DO CAIXA
router.get(
  '/atual',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const terminal = String(
        req.query.terminal || '001',
      ).trim()

      const resultado = await pool.query(
        `
        SELECT *
        FROM caixas
        WHERE empresa_id = $1
          AND terminal = $2
          AND status = 'aberto'
        ORDER BY id DESC
        LIMIT 1
        `,
        [
          req.usuario.empresaId,
          terminal,
        ],
      )

      const caixa = resultado.rows[0]
        ? mapCaixa(resultado.rows[0])
        : null

      return res.status(200).json({
        aberto: Boolean(caixa),
        caixa,
      })
    } catch (erro) {
      console.error(
        'Erro ao consultar caixa:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível consultar o caixa.',
      })
    }
  },
)

// ABRIR CAIXA
router.post(
  '/abrir',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    const client = await pool.connect()

    try {
      const terminal = String(
        req.body.terminal || '001',
      ).trim()

      const valorInicial = numero(
        req.body.valorInicial ?? 0,
      )

      if (
        valorInicial === null ||
        valorInicial < 0
      ) {
        return res.status(400).json({
          erro: 'Valor inicial inválido.',
        })
      }

      await client.query('BEGIN')

      const existente = await client.query(
        `
        SELECT id
        FROM caixas
        WHERE empresa_id = $1
          AND terminal = $2
          AND status = 'aberto'
        LIMIT 1
        FOR UPDATE
        `,
        [
          req.usuario.empresaId,
          terminal,
        ],
      )

      if (existente.rows[0]) {
        await client.query('ROLLBACK')

        return res.status(409).json({
          erro: `O caixa ${terminal} já está aberto.`,
        })
      }

      const resultado = await client.query(
        `
        INSERT INTO caixas (
          empresa_id,
          terminal,
          usuario_abertura_id,
          valor_inicial,
          vendas_dinheiro,
          vendas_pix,
          vendas_debito,
          vendas_credito,
          sangrias,
          status,
          aberto_em
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          0,
          0,
          0,
          0,
          0,
          'aberto',
          CURRENT_TIMESTAMP
        )
        RETURNING *
        `,
        [
          req.usuario.empresaId,
          terminal,
          req.usuario.id,
          valorInicial,
        ],
      )

      const caixa = resultado.rows[0]

      await client.query(
        `
        INSERT INTO movimentos_caixa (
          empresa_id,
          caixa_id,
          terminal,
          tipo,
          valor,
          usuario_id,
          descricao,
          criado_em
        )
        VALUES (
          $1,
          $2,
          $3,
          'abertura',
          $4,
          $5,
          'Abertura de caixa',
          CURRENT_TIMESTAMP
        )
        `,
        [
          req.usuario.empresaId,
          caixa.id,
          terminal,
          valorInicial,
          req.usuario.id,
        ],
      )

      await client.query('COMMIT')

      return res.status(201).json({
        mensagem: 'Caixa aberto com sucesso.',
        caixa: mapCaixa(caixa),
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      if (erro.code === '23505') {
        return res.status(409).json({
          erro: 'Este caixa já está aberto.',
        })
      }

      console.error(
        'Erro ao abrir caixa:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível abrir o caixa.',
      })
    } finally {
      client.release()
    }
  },
)

// SANGRIA
router.post(
  '/sangria',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    const client = await pool.connect()

    try {
      const terminal = String(
        req.body.terminal || '001',
      ).trim()

      const valor = numero(req.body.valor)

      const motivo = String(
        req.body.motivo ||
          'Retirada de numerário',
      ).trim()

      if (valor === null || valor <= 0) {
        return res.status(400).json({
          erro: 'Informe um valor válido para a sangria.',
        })
      }

      await client.query('BEGIN')

      const resultado = await client.query(
        `
        SELECT *
        FROM caixas
        WHERE empresa_id = $1
          AND terminal = $2
          AND status = 'aberto'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
        `,
        [
          req.usuario.empresaId,
          terminal,
        ],
      )

      if (!resultado.rows[0]) {
        await client.query('ROLLBACK')

        return res.status(404).json({
          erro: 'Nenhum caixa aberto encontrado.',
        })
      }

      const caixa = resultado.rows[0]

      const saldoDinheiroAtual =
        Number(caixa.valor_inicial || 0) +
        Number(caixa.vendas_dinheiro || 0) -
        Number(caixa.sangrias || 0)

      if (valor > saldoDinheiroAtual) {
        await client.query('ROLLBACK')

        return res.status(409).json({
          erro:
            `Valor da sangria maior que o dinheiro disponível no caixa. ` +
            `Disponível: R$ ${saldoDinheiroAtual.toFixed(2)}.`,
        })
      }

      const atualizado = await client.query(
        `
        UPDATE caixas
        SET sangrias = sangrias + $1
        WHERE id = $2
          AND empresa_id = $3
        RETURNING *
        `,
        [
          valor,
          caixa.id,
          req.usuario.empresaId,
        ],
      )

      await client.query(
        `
        INSERT INTO movimentos_caixa (
          empresa_id,
          caixa_id,
          terminal,
          tipo,
          valor,
          usuario_id,
          descricao,
          criado_em
        )
        VALUES (
          $1,
          $2,
          $3,
          'sangria',
          $4,
          $5,
          $6,
          CURRENT_TIMESTAMP
        )
        `,
        [
          req.usuario.empresaId,
          caixa.id,
          terminal,
          valor,
          req.usuario.id,
          motivo,
        ],
      )

      await client.query('COMMIT')

      return res.status(201).json({
        mensagem:
          'Sangria registrada com sucesso.',
        caixa: mapCaixa(atualizado.rows[0]),
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      console.error(
        'Erro ao registrar sangria:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível registrar a sangria.',
      })
    } finally {
      client.release()
    }
  },
)

// FECHAR CAIXA
router.post(
  '/fechar',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    const client = await pool.connect()

    try {
      const terminal = String(
        req.body.terminal || '001',
      ).trim()

      const valorInformado = numero(
        req.body.valorInformado,
      )

      if (
        valorInformado === null ||
        valorInformado < 0
      ) {
        return res.status(400).json({
          erro: 'Informe o valor contado no caixa.',
        })
      }

      await client.query('BEGIN')

      const resultado = await client.query(
        `
        SELECT *
        FROM caixas
        WHERE empresa_id = $1
          AND terminal = $2
          AND status = 'aberto'
        ORDER BY id DESC
        LIMIT 1
        FOR UPDATE
        `,
        [
          req.usuario.empresaId,
          terminal,
        ],
      )

      if (!resultado.rows[0]) {
        await client.query('ROLLBACK')

        return res.status(404).json({
          erro: 'Nenhum caixa aberto encontrado.',
        })
      }

      const caixa = resultado.rows[0]

      const saldoTeorico =
        Number(caixa.valor_inicial || 0) +
        Number(caixa.vendas_dinheiro || 0) -
        Number(caixa.sangrias || 0)

      const diferenca =
        valorInformado - saldoTeorico

      const atualizado = await client.query(
        `
        UPDATE caixas
        SET
          status = 'fechado',
          fechado_em = CURRENT_TIMESTAMP,
          usuario_fechamento_id = $1,
          valor_informado_fechamento = $2,
          saldo_teorico = $3,
          diferenca = $4
        WHERE id = $5
          AND empresa_id = $6
        RETURNING *
        `,
        [
          req.usuario.id,
          valorInformado,
          saldoTeorico,
          diferenca,
          caixa.id,
          req.usuario.empresaId,
        ],
      )

      await client.query(
        `
        INSERT INTO movimentos_caixa (
          empresa_id,
          caixa_id,
          terminal,
          tipo,
          valor,
          usuario_id,
          descricao,
          criado_em
        )
        VALUES (
          $1,
          $2,
          $3,
          'fechamento',
          $4,
          $5,
          'Fechamento de caixa',
          CURRENT_TIMESTAMP
        )
        `,
        [
          req.usuario.empresaId,
          caixa.id,
          terminal,
          valorInformado,
          req.usuario.id,
        ],
      )

      await client.query('COMMIT')

      return res.status(200).json({
        mensagem:
          'Caixa fechado com sucesso.',
        caixa: mapCaixa(atualizado.rows[0]),
      })
    } catch (erro) {
      await client.query('ROLLBACK')

      console.error(
        'Erro ao fechar caixa:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível fechar o caixa.',
      })
    } finally {
      client.release()
    }
  },
)

// MOVIMENTOS
router.get(
  '/movimentos',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const terminal = String(
        req.query.terminal || '001',
      ).trim()

      const resultado = await pool.query(
        `
        SELECT *
        FROM movimentos_caixa
        WHERE empresa_id = $1
          AND terminal = $2
        ORDER BY criado_em DESC, id DESC
        `,
        [
          req.usuario.empresaId,
          terminal,
        ],
      )

      return res.status(200).json({
        movimentos:
          resultado.rows.map(mapMovimento),
      })
    } catch (erro) {
      console.error(
        'Erro ao carregar movimentos:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar os movimentos.',
      })
    }
  },
)

// HISTÓRICO
router.get(
  '/historico',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM caixas
        WHERE empresa_id = $1
        ORDER BY aberto_em DESC, id DESC
        `,
        [req.usuario.empresaId],
      )

      return res.status(200).json({
        caixas:
          resultado.rows.map(mapCaixa),
      })
    } catch (erro) {
      console.error(
        'Erro ao carregar histórico:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar o histórico de caixas.',
      })
    }
  },
)

module.exports = router