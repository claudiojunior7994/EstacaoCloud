
const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

router.get('/movimentacoes',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    try {
      const resultado = await pool.query(`
        SELECT
          m.*,
          p.nome AS produto_nome,
          p.codigo_barras,
          u.nome AS usuario_nome
        FROM movimentacoes_estoque m
        JOIN produtos p ON p.id = m.produto_id
        LEFT JOIN usuarios u ON u.id = m.usuario_id
        WHERE m.empresa_id = $1
        ORDER BY m.criado_em DESC
        LIMIT 500
      `, [req.usuario.empresaId])

      res.json({ movimentacoes: resultado.rows })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao consultar movimentações.' })
    }
  }
)

router.post('/ajuste',
  autenticar,
  permitirPerfis('admin','gerente','estoque'),
  async (req,res) => {
    const produtoId = Number(req.body.produtoId)
    const novoEstoque = Number(req.body.novoEstoque)
    const observacao = String(req.body.observacao || '').trim()

    if (!produtoId || !Number.isFinite(novoEstoque) || novoEstoque < 0) {
      return res.status(400).json({ erro: 'Dados de ajuste inválidos.' })
    }

    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const atual = await client.query(`
        SELECT id, estoque
        FROM produtos
        WHERE id = $1 AND empresa_id = $2
        FOR UPDATE
      `, [produtoId, req.usuario.empresaId])

      if (!atual.rows[0]) {
        await client.query('ROLLBACK')
        return res.status(404).json({ erro: 'Produto não encontrado.' })
      }

      const estoqueAnterior = Number(atual.rows[0].estoque)
      const diferenca = novoEstoque - estoqueAnterior

      if (diferenca === 0) {
        await client.query('ROLLBACK')
        return res.status(400).json({ erro: 'O estoque informado é igual ao atual.' })
      }

      await client.query(`
        UPDATE produtos
        SET estoque = $1, atualizado_em = CURRENT_TIMESTAMP
        WHERE id = $2 AND empresa_id = $3
      `, [novoEstoque, produtoId, req.usuario.empresaId])

      await client.query(`
        INSERT INTO movimentacoes_estoque
        (
          empresa_id, produto_id, usuario_id, tipo,
          quantidade, estoque_anterior, estoque_posterior,
          referencia, observacao
        )
        VALUES ($1,$2,$3,'ajuste',$4,$5,$6,'AJUSTE MANUAL',$7)
      `, [
        req.usuario.empresaId,
        produtoId,
        req.usuario.id,
        Math.abs(diferenca),
        estoqueAnterior,
        novoEstoque,
        observacao || null
      ])

      await client.query('COMMIT')

      res.json({
        mensagem: 'Estoque ajustado com sucesso.',
        estoqueAnterior,
        estoqueAtual: novoEstoque,
        diferenca
      })
    } catch (erro) {
      await client.query('ROLLBACK')
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao ajustar estoque.' })
    } finally {
      client.release()
    }
  }
)

module.exports = router
