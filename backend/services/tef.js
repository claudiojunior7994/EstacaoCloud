const crypto = require('crypto')

const TIPOS = ['debito', 'credito']

function normalizarTipo(tipo) {
  const valor = String(tipo || '')
    .trim()
    .toLowerCase()

  return TIPOS.includes(valor) ? valor : null
}

function gerarCodigo(prefixo) {
  return `${prefixo}-${Date.now()}-${crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase()}`
}

async function processarSimulacao({
  tipo,
  valor,
  terminal,
}) {
  return {
    status: 'aprovada',
    nsu: gerarCodigo('NSU'),
    autorizacao: gerarCodigo('AUT'),
    identificadorExterno: gerarCodigo('SIM'),
    mensagem:
      `Transação ${tipo} aprovada em modo de simulação ` +
      `no terminal ${terminal}. Valor: ${Number(valor).toFixed(2)}.`,
  }
}

async function processarTef({
  modo,
  provedor,
  tipo,
  valor,
  terminal,
}) {
  const tipoNormalizado = normalizarTipo(tipo)

  if (!tipoNormalizado) {
    throw new Error('Tipo de transação TEF inválido.')
  }

  if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
    throw new Error('Valor da transação TEF inválido.')
  }

  if (modo === 'simulacao') {
    return processarSimulacao({
      tipo: tipoNormalizado,
      valor,
      terminal,
    })
  }

  /*
   * PRODUÇÃO
   *
   * Aqui será conectado o adaptador oficial do provedor
   * multiadquirente contratado pelo cliente/EstaçãoCloud.
   *
   * O restante do PDV não precisará conhecer SDK,
   * DLL, pinpad ou adquirente específica.
   */
  const erro = new Error(
    `Integração de produção do provedor ${
      provedor || 'TEF'
    } ainda não configurada.`,
  )

  erro.codigo = 'TEF_PRODUCAO_NAO_CONFIGURADO'
  throw erro
}

module.exports = {
  processarTef,
  normalizarTipo,
}
