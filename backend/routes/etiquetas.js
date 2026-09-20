
const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

router.get('/produtos',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    try {
      const busca = String(req.query.busca || '').trim()

      const r = await pool.query(`
        SELECT
          id, nome, codigo_barras, preco,
          preco_clube, clube_ativo,
          unidade, plu
        FROM produtos
        WHERE empresa_id=$1
          AND ativo=TRUE
          AND etiqueta_ativa=TRUE
          AND (
            $2='' OR
            nome ILIKE '%' || $2 || '%' OR
            codigo_barras ILIKE '%' || $2 || '%' OR
            COALESCE(plu,'') ILIKE '%' || $2 || '%'
          )
        ORDER BY nome
        LIMIT 100
      `, [req.usuario.empresaId, busca])

      res.json({ produtos: r.rows })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao consultar produtos.' })
    }
  }
)

router.post('/fila',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    const produtoId = Number(req.body.produtoId)
    const quantidade = Number(req.body.quantidade || 1)

    if (!produtoId || !Number.isInteger(quantidade) || quantidade < 1) {
      return res.status(400).json({ erro: 'Dados inválidos.' })
    }

    try {
      const produto = await pool.query(`
        SELECT *
        FROM produtos
        WHERE id=$1 AND empresa_id=$2 AND ativo=TRUE
      `, [produtoId, req.usuario.empresaId])

      if (!produto.rows[0]) {
        return res.status(404).json({ erro: 'Produto não encontrado.' })
      }

      const p = produto.rows[0]

      const r = await pool.query(`
        INSERT INTO etiquetas_gondola
        (
          empresa_id, produto_id, usuario_id,
          quantidade, preco, preco_clube
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
      `, [
        req.usuario.empresaId,
        produtoId,
        req.usuario.id,
        quantidade,
        p.preco,
        p.clube_ativo ? p.preco_clube : null
      ])

      res.status(201).json({
        mensagem: 'Etiqueta adicionada à fila.',
        etiqueta: r.rows[0]
      })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao gerar etiqueta.' })
    }
  }
)

router.get('/fila',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    try {
      const r = await pool.query(`
        SELECT
          e.*,
          p.nome,
          p.codigo_barras,
          p.unidade,
          p.plu
        FROM etiquetas_gondola e
        JOIN produtos p ON p.id=e.produto_id
        WHERE e.empresa_id=$1 AND e.impressa=FALSE
        ORDER BY e.criada_em
      `, [req.usuario.empresaId])

      res.json({ etiquetas: r.rows })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao carregar fila.' })
    }
  }
)

router.post('/:id/impressa',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    try {
      const r = await pool.query(`
        UPDATE etiquetas_gondola
        SET impressa=TRUE, impressa_em=CURRENT_TIMESTAMP
        WHERE id=$1 AND empresa_id=$2
        RETURNING *
      `, [req.params.id, req.usuario.empresaId])

      if (!r.rows[0]) {
        return res.status(404).json({ erro: 'Etiqueta não encontrada.' })
      }

      res.json({
        mensagem: 'Etiqueta marcada como impressa.',
        etiqueta: r.rows[0]
      })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao atualizar etiqueta.' })
    }
  }
)

module.exports = router
