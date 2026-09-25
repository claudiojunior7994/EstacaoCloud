
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
          endereco, logradouro, numero_endereco, complemento, bairro,
          cidade, estado, cep, inscricao_estadual,
          regime_tributario, codigo_municipio_ibge,
          nfce_ambiente, nfce_serie, nfce_proximo_numero,
          nfce_csc_id,
          CASE
            WHEN nfce_csc IS NOT NULL AND LENGTH(TRIM(nfce_csc)) > 0
            THEN TRUE
            ELSE FALSE
          END AS nfce_csc_configurado,
          nfce_habilitada,
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
        logradouro: req.body.logradouro === undefined ? e.logradouro : texto(req.body.logradouro),
        numeroEndereco: req.body.numeroEndereco === undefined ? e.numero_endereco : texto(req.body.numeroEndereco),
        complemento: req.body.complemento === undefined ? e.complemento : texto(req.body.complemento),
        bairro: req.body.bairro === undefined ? e.bairro : texto(req.body.bairro),
        cidade: req.body.cidade === undefined ? e.cidade : texto(req.body.cidade),
        estado: req.body.estado === undefined ? e.estado : texto(req.body.estado).toUpperCase(),
        cep: req.body.cep === undefined ? e.cep : texto(req.body.cep),
        inscricaoEstadual: req.body.inscricaoEstadual === undefined ? e.inscricao_estadual : texto(req.body.inscricaoEstadual),
        regimeTributario: req.body.regimeTributario === undefined ? e.regime_tributario : texto(req.body.regimeTributario),
        codigoMunicipioIbge: req.body.codigoMunicipioIbge === undefined ? e.codigo_municipio_ibge : texto(req.body.codigoMunicipioIbge),
        nfceAmbiente: req.body.nfceAmbiente === undefined ? e.nfce_ambiente : texto(req.body.nfceAmbiente),
        nfceSerie: req.body.nfceSerie === undefined ? e.nfce_serie : Number(req.body.nfceSerie),
        nfceProximoNumero: req.body.nfceProximoNumero === undefined ? e.nfce_proximo_numero : Number(req.body.nfceProximoNumero),
        nfceCscId: req.body.nfceCscId === undefined ? e.nfce_csc_id : texto(req.body.nfceCscId),
        nfceCsc:
          req.body.nfceCsc === undefined ||
          texto(req.body.nfceCsc) === ''
            ? e.nfce_csc
            : texto(req.body.nfceCsc),
        nfceHabilitada: req.body.nfceHabilitada === undefined ? e.nfce_habilitada : Boolean(req.body.nfceHabilitada),
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
          logradouro=$7,
          numero_endereco=$8,
          complemento=$9,
          bairro=$10,
          cidade=$11,
          estado=$12,
          cep=$13,
          inscricao_estadual=$14,
          regime_tributario=$15,
          codigo_municipio_ibge=$16,
          nfce_ambiente=$17,
          nfce_serie=$18,
          nfce_proximo_numero=$19,
          nfce_csc_id=$20,
          nfce_csc=$21,
          nfce_habilitada=$22,
          mensagem_comprovante=$23,
          permite_estoque_negativo=$24,
          atualizada_em=CURRENT_TIMESTAMP
        WHERE id=$25
        RETURNING
          id,
          nome,
          nome_fantasia,
          cnpj,
          email,
          telefone,
          endereco,
          logradouro,
          numero_endereco,
          complemento,
          bairro,
          cidade,
          estado,
          cep,
          inscricao_estadual,
          regime_tributario,
          codigo_municipio_ibge,
          nfce_ambiente,
          nfce_serie,
          nfce_proximo_numero,
          nfce_csc_id,
          CASE
            WHEN nfce_csc IS NOT NULL
              AND LENGTH(TRIM(nfce_csc)) > 0
            THEN TRUE
            ELSE FALSE
          END AS nfce_csc_configurado,
          nfce_habilitada,
          mensagem_comprovante,
          permite_estoque_negativo,
          ativa
      `, [
        dados.nome,
        dados.nomeFantasia || null,
        dados.cnpj || null,
        dados.email || null,
        dados.telefone || null,
        dados.endereco || null,
        dados.logradouro || null,
        dados.numeroEndereco || null,
        dados.complemento || null,
        dados.bairro || null,
        dados.cidade || null,
        dados.estado || null,
        dados.cep || null,
        dados.inscricaoEstadual || null,
        dados.regimeTributario || null,
        dados.codigoMunicipioIbge || null,
        dados.nfceAmbiente || 'homologacao',
        dados.nfceSerie,
        dados.nfceProximoNumero,
        dados.nfceCscId || null,
        dados.nfceCsc || null,
        dados.nfceHabilitada,
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
