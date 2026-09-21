const express = require('express')
const router = express.Router()
const { pool } = require('../database/db')

router.get('/', async (req, res) => {
  try {
    const { busca = '', status = 'todos' } = req.query

    const parametros = []
    const filtros = []

    if (busca.trim()) {
      parametros.push(`%${busca.trim()}%`)
      filtros.push(`
        (
          LOWER(p.nome) LIKE LOWER($${parametros.length})
          OR LOWER(pl.lote) LIKE LOWER($${parametros.length})
          OR LOWER(COALESCE(p.codigo_barras, '')) LIKE LOWER($${parametros.length})
          OR LOWER(COALESCE(p.plu, '')) LIKE LOWER($${parametros.length})
        )
      `)
    }

    if (status === 'vencido') {
      filtros.push(`pl.validade < CURRENT_DATE`)
    }

    if (status === '7dias') {
      filtros.push(`
        pl.validade >= CURRENT_DATE
        AND pl.validade <= CURRENT_DATE + INTERVAL '7 days'
      `)
    }

    if (status === '30dias') {
      filtros.push(`
        pl.validade > CURRENT_DATE + INTERVAL '7 days'
        AND pl.validade <= CURRENT_DATE + INTERVAL '30 days'
      `)
    }

    if (status === 'sem-validade') {
      filtros.push(`pl.validade IS NULL`)
    }

    const where = filtros.length
      ? `WHERE ${filtros.join(' AND ')}`
      : ''

    const resultado = await pool.query(
      `
      SELECT
        pl.id,
        pl.produto_id,
        p.nome AS produto_nome,
        p.codigo_barras,
        p.plu,
        p.unidade,
        pl.lote,
        pl.quantidade,
        pl.validade,
        pl.custo_unitario,
        pl.recebimento_id,
        pl.criado_em,
        CASE
          WHEN pl.validade IS NULL THEN 'sem_validade'
          WHEN pl.validade < CURRENT_DATE THEN 'vencido'
          WHEN pl.validade <= CURRENT_DATE + INTERVAL '7 days' THEN 'critico'
          WHEN pl.validade <= CURRENT_DATE + INTERVAL '30 days' THEN 'atencao'
          ELSE 'normal'
        END AS situacao,
        CASE
          WHEN pl.validade IS NULL THEN NULL
          ELSE pl.validade - CURRENT_DATE
        END AS dias_para_vencer
      FROM produto_lotes pl
      INNER JOIN produtos p ON p.id = pl.produto_id
      ${where}
      ORDER BY
        CASE WHEN pl.validade IS NULL THEN 1 ELSE 0 END,
        pl.validade ASC,
        p.nome ASC
      `,
      parametros
    )

    const resumoResultado = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE validade < CURRENT_DATE
        )::INTEGER AS vencidos,

        COUNT(*) FILTER (
          WHERE validade >= CURRENT_DATE
          AND validade <= CURRENT_DATE + INTERVAL '7 days'
        )::INTEGER AS ate_7_dias,

        COUNT(*) FILTER (
          WHERE validade > CURRENT_DATE + INTERVAL '7 days'
          AND validade <= CURRENT_DATE + INTERVAL '30 days'
        )::INTEGER AS ate_30_dias,

        COUNT(*) FILTER (
          WHERE validade IS NULL
        )::INTEGER AS sem_validade
      FROM produto_lotes
    `)

    res.json({
      lotes: resultado.rows,
      resumo: resumoResultado.rows[0],
    })
  } catch (erro) {
    console.error('Erro ao listar lotes:', erro)
    res.status(500).json({
      erro: 'Erro ao carregar lotes e validades.',
    })
  }
})

module.exports = router
