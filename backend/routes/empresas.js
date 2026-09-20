
const express = require('express')
const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const router = express.Router()

function texto(v) {
  return String(v == null ? '' : v).trim()
}

router.get('/minha-empresa',
  autenticar,
  async (req,res) => {
    try {
      const r = await pool.query(`
        SELECT
          id, nome, nome_fantasia, cnpj, email, telefone,
          endereco, cidade, estado, cep, inscricao_estadual,
          mensagem_comprovante, permite_estoque_negativo, ativa
        FROM empresas
        WHERE id=$1
      `, [req.usuario.empresaId])

      if (!r.rows[0]) {
        return res.status(404).json({ erro: 'Empresa não encontrada.' })
      }

      res.json({ empresa: r.rows[0] })
    } catch (erro) {
      console.error(erro)
      res.status(500).json({ erro: 'Erro ao carregar empresa.' })
    }
  }
)

router.patch('/minha-empresa',
  autenticar,
  permitirPerfis('admin'),
  async (req,res) => {
    try {
      const atual = await pool.query(
        'SELECT * FROM empresas WHERE id=$1',
        [req.usuario.empresaId]
      )

      if (!atual.rows[0]) {
        return res.status(404).json({ erro: 'Empresa não encontrada.' })
      }

      const e = atual.rows[0]

      const dados = {
        nome: req.body.nome === undefined ? e.nome : texto(req.body.nome),
        nomeFantasia: req.body.nomeFantasia === undefined ? e.nome_fantasia : texto(req.body.nomeFantasia),
        cnpj: req.body.cnpj === undefined ? e.cnpj : texto(req.body.cnpj),
        email: req.body.email === undefined ? e.email : texto(req.body.email),
        telefone: req.body.telefone === undefined ? e.telefone : texto(req.body.telefone),
        endereco: req.body.endereco === undefined ? e.endereco : texto(req.body.endereco),
        cidade: req.body.cidade === undefined ? e.cidade : texto(req.body.cidade),
        estado: req.body.estado === undefined ? e.estado : texto(req.body.estado).toUpperCase(),
        cep: req.body.cep === undefined ? e.cep : texto(req.body.cep),
        inscricaoEstadual: req.body.inscricaoEstadual === undefined ? e.inscricao_estadual : texto(req.body.inscricaoEstadual),
        mensagemComprovante: req.body.mensagemComprovante === undefined ? e.mensagem_comprovante : texto(req.body.mensagemComprovante),
        permiteEstoqueNegativo:
          req.body.permiteEstoqueNegativo === undefined
            ? e.permite_estoque_negativo
            : Boolean(req.body.permiteEstoqueNegativo)
      }

      if (!dados.nome) {
        return res.status(400).json({ erro: 'Nome da empresa é obrigatório.' })
      }

      if (dados.estado && dados.estado.length !== 2) {
        return res.status(400).json({ erro: 'UF deve possuir 2 caracteres.' })
      }

      const r = await pool.query(`
        UPDATE empresas SET
          nome=$1,
          nome_fantasia=$2,
          cnpj=$3,
          email=$4,
          telefone=$5,
          endereco=$6,
          cidade=$7,
          estado=$8,
          cep=$9,
          inscricao_estadual=$10,
          mensagem_comprovante=$11,
          permite_estoque_negativo=$12,
          atualizada_em=CURRENT_TIMESTAMP
        WHERE id=$13
        RETURNING *
      `, [
        dados.nome,
        dados.nomeFantasia || null,
        dados.cnpj || null,
        dados.email || null,
        dados.telefone || null,
        dados.endereco || null,
        dados.cidade || null,
        dados.estado || null,
        dados.cep || null,
        dados.inscricaoEstadual || null,
        dados.mensagemComprovante || null,
        dados.permiteEstoqueNegativo,
        req.usuario.empresaId
      ])

      res.json({
        mensagem: 'Configurações salvas.',
        empresa: r.rows[0]
      })
    } catch (erro) {
      if (erro.code === '23505') {
        return res.status(409).json({ erro: 'CNPJ já cadastrado.' })
      }

      console.error(erro)
      res.status(500).json({ erro: 'Erro ao atualizar empresa.' })
    }
  }
)

module.exports = router
