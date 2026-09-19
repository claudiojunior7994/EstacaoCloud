const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function mapCategoria(row) {
  return {
    id: row.id,
    nome: row.nome,
    ativo: row.ativo,
    criadoEm: row.criado_em || null,
    atualizadoEm: row.atualizado_em || null,
  }
}

// =====================================================
// LISTAR CATEGORIAS
// =====================================================

router.get('/', autenticar, async (req, res) => {
  try {
    const resultado = await pool.query(
      `
        SELECT *
        FROM categorias
        WHERE empresa_id = $1
        ORDER BY nome ASC
      `,
      [req.usuario.empresaId],
    )

    return res.status(200).json(
      resultado.rows.map(mapCategoria),
    )
  } catch (erro) {
    console.error('Erro ao listar categorias:', erro)

    return res.status(500).json({
      erro: 'Erro ao carregar categorias.',
    })
  }
})

// =====================================================
// CRIAR CATEGORIA
// =====================================================

router.post(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const nome = String(req.body.nome || '').trim()

      if (!nome) {
        return res.status(400).json({
          erro: 'Informe o nome da categoria.',
        })
      }

      const categoriaExistente = await pool.query(
        `
          SELECT id
          FROM categorias
          WHERE empresa_id = $1
            AND LOWER(nome) = LOWER($2)
          LIMIT 1
        `,
        [req.usuario.empresaId, nome],
      )

      if (categoriaExistente.rowCount > 0) {
        return res.status(409).json({
          erro: 'Essa categoria já existe.',
        })
      }

      const resultado = await pool.query(
        `
          INSERT INTO categorias (
            empresa_id,
            nome,
            ativo
          )
          VALUES ($1, $2, TRUE)
          RETURNING *
        `,
        [
          req.usuario.empresaId,
          nome,
        ],
      )

      return res.status(201).json(
        mapCategoria(resultado.rows[0]),
      )
    } catch (erro) {
      console.error('Erro ao criar categoria:', erro)

      return res.status(500).json({
        erro: 'Erro ao criar categoria.',
      })
    }
  },
)

// =====================================================
// ATIVAR / INATIVAR CATEGORIA
// =====================================================

router.patch(
  '/:id/status',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          erro: 'Categoria inválida.',
        })
      }

      if (typeof req.body.ativo !== 'boolean') {
        return res.status(400).json({
          erro: 'Informe o status da categoria.',
        })
      }

      const resultado = await pool.query(
        `
          UPDATE categorias
          SET ativo = $1
          WHERE id = $2
            AND empresa_id = $3
          RETURNING *
        `,
        [
          req.body.ativo,
          id,
          req.usuario.empresaId,
        ],
      )

      if (resultado.rowCount === 0) {
        return res.status(404).json({
          erro: 'Categoria não encontrada.',
        })
      }

      return res.status(200).json(
        mapCategoria(resultado.rows[0]),
      )
    } catch (erro) {
      console.error(
        'Erro ao alterar categoria:',
        erro,
      )

      return res.status(500).json({
        erro: 'Erro ao alterar categoria.',
      })
    }
  },
)

// =====================================================
// EXCLUIR CATEGORIA
// =====================================================

router.delete(
  '/:id',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const id = Number(req.params.id)

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          erro: 'Categoria inválida.',
        })
      }

      const categoriaResultado = await pool.query(
        `
          SELECT id, nome
          FROM categorias
          WHERE id = $1
            AND empresa_id = $2
          LIMIT 1
        `,
        [
          id,
          req.usuario.empresaId,
        ],
      )

      if (categoriaResultado.rowCount === 0) {
        return res.status(404).json({
          erro: 'Categoria não encontrada.',
        })
      }

      const categoria = categoriaResultado.rows[0]

      const produtosResultado = await pool.query(
        `
          SELECT COUNT(*)::INTEGER AS total
          FROM produtos
          WHERE empresa_id = $1
            AND LOWER(COALESCE(categoria, '')) =
                LOWER($2)
        `,
        [
          req.usuario.empresaId,
          categoria.nome,
        ],
      )

      const totalProdutos =
        produtosResultado.rows[0].total

      if (totalProdutos > 0) {
        return res.status(409).json({
          erro:
            'Não é possível excluir esta categoria porque existem produtos vinculados a ela.',
        })
      }

      await pool.query(
        `
          DELETE FROM categorias
          WHERE id = $1
            AND empresa_id = $2
        `,
        [
          id,
          req.usuario.empresaId,
        ],
      )

      return res.status(200).json({
        mensagem: 'Categoria excluída com sucesso.',
      })
    } catch (erro) {
      console.error('Erro ao excluir categoria:', erro)

      return res.status(500).json({
        erro: 'Erro ao excluir categoria.',
      })
    }
  },
)

module.exports = router