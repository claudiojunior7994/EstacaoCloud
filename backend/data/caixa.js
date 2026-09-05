const express = require('express')

const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')

const {
  caixas,
  movimentosCaixa,
  gerarIdCaixa,
  gerarIdMovimento,
  buscarCaixaAberto,
} = require('./caixaStore')

const router = express.Router()

function numero(valor) {
  const convertido = Number(valor)

  if (!Number.isFinite(convertido)) {
    return null
  }

  return convertido
}

// STATUS DO CAIXA
router.get(
  '/atual',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const terminal = String(
      req.query.terminal || '001',
    )

    const caixa = buscarCaixaAberto(
      req.usuario.empresaId,
      terminal,
    )

    return res.status(200).json({
      aberto: Boolean(caixa),
      caixa: caixa || null,
    })
  },
)

// ABRIR CAIXA
router.post(
  '/abrir',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const {
      terminal = '001',
      valorInicial = 0,
    } = req.body

    const terminalNormalizado = String(
      terminal || '001',
    ).trim()

    const valorInicialNormalizado =
      numero(valorInicial)

    if (
      valorInicialNormalizado === null ||
      valorInicialNormalizado < 0
    ) {
      return res.status(400).json({
        erro: 'Valor inicial inválido.',
      })
    }

    const caixaExistente = buscarCaixaAberto(
      req.usuario.empresaId,
      terminalNormalizado,
    )

    if (caixaExistente) {
      return res.status(409).json({
        erro: `O caixa ${terminalNormalizado} já está aberto.`,
        caixa: caixaExistente,
      })
    }

    const agora = new Date().toISOString()

    const caixa = {
      id: gerarIdCaixa(),
      empresaId: req.usuario.empresaId,
      terminal: terminalNormalizado,
      usuarioAberturaId: req.usuario.id,
      valorInicial: valorInicialNormalizado,

      vendasDinheiro: 0,
      vendasPix: 0,
      vendasDebito: 0,
      vendasCredito: 0,

      sangrias: 0,

      status: 'aberto',
      abertoEm: agora,

      fechadoEm: null,
      usuarioFechamentoId: null,
      valorInformadoFechamento: null,
      saldoTeorico: null,
      diferenca: null,
    }

    caixas.unshift(caixa)

    movimentosCaixa.unshift({
      id: gerarIdMovimento(),
      empresaId: req.usuario.empresaId,
      caixaId: caixa.id,
      terminal: caixa.terminal,
      tipo: 'abertura',
      valor: valorInicialNormalizado,
      usuarioId: req.usuario.id,
      descricao: 'Abertura de caixa',
      criadoEm: agora,
    })

    return res.status(201).json({
      mensagem: 'Caixa aberto com sucesso.',
      caixa,
    })
  },
)

// SANGRIA
router.post(
  '/sangria',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const {
      terminal = '001',
      valor,
      motivo = 'Retirada de numerário',
    } = req.body

    const valorNormalizado = numero(valor)

    if (
      valorNormalizado === null ||
      valorNormalizado <= 0
    ) {
      return res.status(400).json({
        erro: 'Informe um valor válido para a sangria.',
      })
    }

    const caixa = buscarCaixaAberto(
      req.usuario.empresaId,
      String(terminal),
    )

    if (!caixa) {
      return res.status(404).json({
        erro: 'Nenhum caixa aberto encontrado.',
      })
    }

    const saldoDinheiroAtual =
      Number(caixa.valorInicial || 0) +
      Number(caixa.vendasDinheiro || 0) -
      Number(caixa.sangrias || 0)

    if (valorNormalizado > saldoDinheiroAtual) {
      return res.status(409).json({
        erro: `Valor da sangria maior que o dinheiro disponível no caixa. Disponível: R$ ${saldoDinheiroAtual.toFixed(
          2,
        )}.`,
      })
    }

    const agora = new Date().toISOString()

    caixa.sangrias =
      Number(caixa.sangrias || 0) +
      valorNormalizado

    movimentosCaixa.unshift({
      id: gerarIdMovimento(),
      empresaId: req.usuario.empresaId,
      caixaId: caixa.id,
      terminal: caixa.terminal,
      tipo: 'sangria',
      valor: valorNormalizado,
      usuarioId: req.usuario.id,
      descricao: String(
        motivo || 'Retirada de numerário',
      ),
      criadoEm: agora,
    })

    return res.status(201).json({
      mensagem: 'Sangria registrada com sucesso.',
      caixa,
    })
  },
)

// FECHAR CAIXA
router.post(
  '/fechar',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const {
      terminal = '001',
      valorInformado,
    } = req.body

    const valorInformadoNormalizado =
      numero(valorInformado)

    if (
      valorInformadoNormalizado === null ||
      valorInformadoNormalizado < 0
    ) {
      return res.status(400).json({
        erro: 'Informe o valor contado no caixa.',
      })
    }

    const caixa = buscarCaixaAberto(
      req.usuario.empresaId,
      String(terminal),
    )

    if (!caixa) {
      return res.status(404).json({
        erro: 'Nenhum caixa aberto encontrado.',
      })
    }

    const saldoTeorico =
      Number(caixa.valorInicial || 0) +
      Number(caixa.vendasDinheiro || 0) -
      Number(caixa.sangrias || 0)

    const diferenca =
      valorInformadoNormalizado - saldoTeorico

    const agora = new Date().toISOString()

    caixa.status = 'fechado'
    caixa.fechadoEm = agora
    caixa.usuarioFechamentoId = req.usuario.id
    caixa.valorInformadoFechamento =
      valorInformadoNormalizado
    caixa.saldoTeorico = saldoTeorico
    caixa.diferenca = diferenca

    movimentosCaixa.unshift({
      id: gerarIdMovimento(),
      empresaId: req.usuario.empresaId,
      caixaId: caixa.id,
      terminal: caixa.terminal,
      tipo: 'fechamento',
      valor: valorInformadoNormalizado,
      usuarioId: req.usuario.id,
      descricao: 'Fechamento de caixa',
      criadoEm: agora,
    })

    return res.status(200).json({
      mensagem: 'Caixa fechado com sucesso.',
      caixa,
    })
  },
)

// MOVIMENTOS DO CAIXA ATUAL
router.get(
  '/movimentos',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  (req, res) => {
    const terminal = String(
      req.query.terminal || '001',
    )

    const movimentos = movimentosCaixa.filter(
      (movimento) =>
        movimento.empresaId ===
          req.usuario.empresaId &&
        movimento.terminal === terminal,
    )

    return res.status(200).json({
      movimentos,
    })
  },
)

// HISTÓRICO DE CAIXAS
router.get(
  '/historico',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    const historico = caixas.filter(
      (caixa) =>
        caixa.empresaId === req.usuario.empresaId,
    )

    return res.status(200).json({
      caixas: historico,
    })
  },
)

module.exports = router