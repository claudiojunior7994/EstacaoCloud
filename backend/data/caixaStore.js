const caixas = []
const movimentosCaixa = []

let proximoIdCaixa = 1
let proximoIdMovimento = 1

function gerarIdCaixa() {
  return proximoIdCaixa++
}

function gerarIdMovimento() {
  return proximoIdMovimento++
}

function buscarCaixaAberto(empresaId, terminal = '001') {
  return caixas.find(
    (caixa) =>
      caixa.empresaId === empresaId &&
      caixa.terminal === String(terminal) &&
      caixa.status === 'aberto',
  )
}

module.exports = {
  caixas,
  movimentosCaixa,
  gerarIdCaixa,
  gerarIdMovimento,
  buscarCaixaAberto,
}