const fs = require('fs')

const arquivo = 'routes/vendas.js'
const backup = 'routes/vendas.js.bak-clube-final'

const original = fs.readFileSync(arquivo, 'utf8')

const inicio = original.indexOf('// REALIZAR VENDA')
const fim = original.indexOf('// BUSCAR VENDA')

if (inicio === -1 || fim === -1 || fim <= inicio) {
  console.error('ERRO: bloco REALIZAR VENDA não localizado.')
  console.error('NENHUMA ALTERAÇÃO FOI SALVA.')
  process.exit(1)
}

const antes = original.slice(0, inicio)
let venda = original.slice(inicio, fim)
const depois = original.slice(fim)

function trocarUma(regex, novo, nome) {
  const encontrados = venda.match(regex)

  if (!encontrados || encontrados.length !== 1) {
    console.error(
      `ERRO em "${nome}". Ocorrências dentro de REALIZAR VENDA: ${encontrados?.length || 0}`,
    )
    console.error('NENHUMA ALTERAÇÃO FOI SALVA.')
    process.exit(1)
  }

  venda = venda.replace(regex, novo)
  console.log(`OK: ${nome}`)
}

/* 1 - variável que guarda se o cliente é Clube */
trocarUma(
  /let clienteNormalizado\s*=\s*null/,
  `let clienteNormalizado = null
      let clienteClube = false`,
  'variável cliente Clube',
)

/* 2 - consulta também o campo clube */
trocarUma(
  /SELECT\s+id,\s*ativo\s+FROM\s+clientes/,
  `SELECT id, ativo, clube
            FROM clientes`,
  'consulta cliente + clube',
)

/* 3 - depois de validar cliente ativo, registra Clube */
trocarUma(
  /if\s*\(\s*clienteResultado\.rows\[0\]\.ativo\s*===\s*false\s*\)\s*\{[\s\S]*?return res\.status\(400\)\.json\(\{\s*erro:\s*'Cliente está inativo\.',\s*\}\)\s*\}/,
  (bloco) =>
    `${bloco}

        clienteClube =
          clienteResultado.rows[0].clube === true`,
  'status Clube do cliente',
)

/* 4 - servidor escolhe o preço */
trocarUma(
  /const precoUnitario\s*=\s*Number\(produto\.preco\)/,
  `const possuiPrecoClube =
          clienteClube &&
          produto.clube_ativo === true &&
          produto.preco_clube !== null &&
          produto.preco_clube !== undefined

        const precoUnitario = possuiPrecoClube
          ? Number(produto.preco_clube)
          : Number(produto.preco)

        if (
          !Number.isFinite(precoUnitario) ||
          precoUnitario < 0
        ) {
          await client.query('ROLLBACK')

          return res.status(400).json({
            erro: \`Preço inválido para "\${produto.nome}".\`,
          })
        }`,
  'preço Clube no servidor',
)

/* validação antes de salvar */
const obrigatorios = [
  'let clienteClube = false',
  'SELECT id, ativo, clube',
  'clienteResultado.rows[0].clube === true',
  'produto.clube_ativo === true',
  'Number(produto.preco_clube)',
]

for (const trecho of obrigatorios) {
  if (!venda.includes(trecho)) {
    console.error(`ERRO NA VALIDAÇÃO FINAL: ${trecho}`)
    console.error('NENHUMA ALTERAÇÃO FOI SALVA.')
    process.exit(1)
  }
}

const final = antes + venda + depois

fs.writeFileSync(backup, original, 'utf8')
fs.writeFileSync(arquivo, final, 'utf8')

console.log('')
console.log('======================================')
console.log('CLUBE ESTAÇÃO - BACKEND ATUALIZADO OK')
console.log('Backup:', backup)
console.log('======================================')
