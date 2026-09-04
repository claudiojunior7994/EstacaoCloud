const produtos = []

let proximoId = 1

function gerarIdProduto() {
  const id = proximoId
  proximoId += 1
  return id
}

module.exports = {
  produtos,
  gerarIdProduto,
}
