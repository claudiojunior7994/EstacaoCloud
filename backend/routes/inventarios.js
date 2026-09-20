
const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

router.get('/',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    try {
      const r = await pool.query(`
        SELECT
          i.*,
          u.nome AS usuario_nome,
          COUNT(ii.id)::int AS total_itens,
          COUNT(ii.estoque_contado)::int AS itens_contados
        FROM inventarios i
        LEFT JOIN usuarios u ON u.id = i.usuario_id
        LEFT JOIN inventario_itens ii ON ii.inventario_id = i.id
        WHERE i.empresa_id = $1
        GROUP BY i.id, u.nome
        ORDER BY i.iniciado_em DESC
      `, [req.usuario.empresaId])

      res.json({ inventarios: r.rows })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao carregar inventários.' })
    }
  }
)

router.post('/',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    const descricao = String(req.body.descricao || 'Inventário geral').trim()
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const aberto = await client.query(`
        SELECT id FROM inventarios
        WHERE empresa_id=$1 AND status='aberto'
        LIMIT 1
      `, [req.usuario.empresaId])

      if (aberto.rows[0]) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          erro: 'Já existe um inventário aberto.'
        })
      }

      const inv = await client.query(`
        INSERT INTO inventarios
        (empresa_id, usuario_id, descricao)
        VALUES ($1,$2,$3)
        RETURNING *
      `, [
        req.usuario.empresaId,
        req.usuario.id,
        descricao
      ])

      await client.query(`
        INSERT INTO inventario_itens
        (inventario_id, produto_id, estoque_sistema)
        SELECT $1, id, estoque
        FROM produtos
        WHERE empresa_id=$2 AND ativo=TRUE
      `, [
        inv.rows[0].id,
        req.usuario.empresaId
      ])

      await client.query('COMMIT')

      res.status(201).json({
        mensagem: 'Inventário iniciado.',
        inventario: inv.rows[0]
      })
    } catch (erro) {
      await client.query('ROLLBACK')
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao iniciar inventário.' })
    } finally {
      client.release()
    }
  }
)

router.get('/:id',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    try {
      const inv = await pool.query(`
        SELECT *
        FROM inventarios
        WHERE id=$1 AND empresa_id=$2
      `, [req.params.id, req.usuario.empresaId])

      if (!inv.rows[0]) {
        return res.status(404).json({ erro: 'Inventário não encontrado.' })
      }

      const itens = await pool.query(`
        SELECT
          ii.*,
          p.nome,
          p.codigo_barras,
          p.unidade,
          p.plu
        FROM inventario_itens ii
        JOIN produtos p ON p.id=ii.produto_id
        WHERE ii.inventario_id=$1
        ORDER BY p.nome
      `, [req.params.id])

      res.json({
        inventario: inv.rows[0],
        itens: itens.rows
      })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao carregar inventário.' })
    }
  }
)

router.patch('/:id/item/:produtoId',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    const contado = Number(req.body.estoqueContado)

    if (!Number.isFinite(contado) || contado < 0) {
      return res.status(400).json({ erro: 'Quantidade inválida.' })
    }

    try {
      const r = await pool.query(`
        UPDATE inventario_itens ii
        SET
          estoque_contado=$1,
          diferenca=$1-ii.estoque_sistema,
          contado_em=CURRENT_TIMESTAMP
        FROM inventarios i
        WHERE
          ii.inventario_id=$2
          AND ii.produto_id=$3
          AND i.id=ii.inventario_id
          AND i.empresa_id=$4
          AND i.status='aberto'
        RETURNING ii.*
      `, [
        contado,
        req.params.id,
        req.params.produtoId,
        req.usuario.empresaId
      ])

      if (!r.rows[0]) {
        return res.status(404).json({
          erro: 'Item ou inventário aberto não encontrado.'
        })
      }

      res.json({ item: r.rows[0] })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao registrar contagem.' })
    }
  }
)

router.post('/:id/finalizar',
  autenticar,
  permitirPerfis('admin','gerente'),
  async (req,res) => {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const inv = await client.query(`
        SELECT *
        FROM inventarios
        WHERE id=$1 AND empresa_id=$2 AND status='aberto'
        FOR UPDATE
      `, [req.params.id, req.usuario.empresaId])

      if (!inv.rows[0]) {
        await client.query('ROLLBACK')
        return res.status(404).json({ erro: 'Inventário aberto não encontrado.' })
      }

      const pendentes = await client.query(`
        SELECT COUNT(*)::int AS total
        FROM inventario_itens
        WHERE inventario_id=$1 AND estoque_contado IS NULL
      `, [req.params.id])

      if (pendentes.rows[0].total > 0) {
        await client.query('ROLLBACK')
        return res.status(409).json({
          erro: 'Existem produtos ainda não contados.',
          pendentes: pendentes.rows[0].total
        })
      }

      const itens = await client.query(`
        SELECT *
        FROM inventario_itens
        WHERE inventario_id=$1
        ORDER BY id
      `, [req.params.id])

      for (const item of itens.rows) {
        const anterior = Number(item.estoque_sistema)
        const posterior = Number(item.estoque_contado)

        if (anterior === posterior) continue

        await client.query(`
          UPDATE produtos
          SET estoque=$1, atualizado_em=CURRENT_TIMESTAMP
          WHERE id=$2 AND empresa_id=$3
        `, [
          posterior,
          item.produto_id,
          req.usuario.empresaId
        ])

        await client.query(`
          INSERT INTO movimentacoes_estoque
          (
            empresa_id, produto_id, usuario_id, tipo,
            quantidade, estoque_anterior, estoque_posterior,
            referencia, observacao
          )
          VALUES ($1,$2,$3,'inventario',$4,$5,$6,$7,$8)
        `, [
          req.usuario.empresaId,
          item.produto_id,
          req.usuario.id,
          Math.abs(posterior-anterior),
          anterior,
          posterior,
          'INVENTARIO #' + req.params.id,
          'Ajuste automático após contagem física'
        ])
      }

      await client.query(`
        UPDATE inventarios
        SET status='finalizado', finalizado_em=CURRENT_TIMESTAMP
        WHERE id=$1
      `, [req.params.id])

      await client.query('COMMIT')

      res.json({ mensagem: 'Inventário finalizado e estoque atualizado.' })
    } catch (erro) {
      await client.query('ROLLBACK')
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao finalizar inventário.' })
    } finally {
      client.release()
    }
  }
)

module.exports = router
