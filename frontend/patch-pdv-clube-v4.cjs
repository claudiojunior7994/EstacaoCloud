const fs = require('fs')

const arquivo = 'src/components/pdv/Pdv.jsx'
const original = fs.readFileSync(arquivo, 'utf8')
let codigo = original

function uma(antigo, novo, nome) {
  const qtd = codigo.split(antigo).length - 1

  if (qtd !== 1) {
    console.error(`ERRO ${nome}: ${qtd} ocorrência(s)`)
    console.error('NADA FOI SALVO.')
    process.exit(1)
  }

  codigo = codigo.replace(antigo, novo)
  console.log(`OK: ${nome}`)
}

/* ESTADO */
uma(
`  const [produtos, setProdutos] = useState([])`,
`  const [produtos, setProdutos] = useState([])

  // CLIENTE / CLUBE ESTAÇÃO
  const [clienteVenda, setClienteVenda] = useState(null)`,
'estado cliente'
)

/* FUNÇÕES */
uma(
`  function adicionarProduto(produto) {`,
`  function normalizarDocumento(valor) {
    return String(valor || '').replace(/\\D/g, '')
  }

  function obterPrecoProduto(produto, cliente = clienteVenda) {
    const precoClube =
      produto?.precoClube ??
      produto?.preco_clube

    const clubeAtivo =
      produto?.clubeAtivo ??
      produto?.clube_ativo ??
      false

    if (
      cliente?.clube === true &&
      clubeAtivo === true &&
      precoClube !== null &&
      precoClube !== undefined &&
      precoClube !== '' &&
      Number.isFinite(Number(precoClube)) &&
      Number(precoClube) >= 0
    ) {
      return Number(precoClube)
    }

    return Number(produto?.preco || 0)
  }

  function recalcularItensCliente(cliente) {
    setItens((atuais) =>
      atuais.map((item) => {
        const produto = produtos.find(
          (p) =>
            Number(p.id) ===
            Number(item.produtoId || item.id),
        )

        if (!produto) return item

        return {
          ...item,
          preco: obterPrecoProduto(produto, cliente),
        }
      }),
    )

    setProdutoAtual((atual) => {
      if (!atual?.id) return atual

      const produto = produtos.find(
        (p) => Number(p.id) === Number(atual.id),
      )

      if (!produto) return atual

      const preco = obterPrecoProduto(produto, cliente)

      return {
        ...atual,
        precoUnitario: preco,
        total: Number(atual.quantidade || 0) * preco,
      }
    })
  }

  async function identificarCliente() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    const documento = window.prompt(
      clienteVenda
        ? 'CPF/CNPJ do cliente. Deixe vazio para remover o cliente atual:'
        : 'Digite o CPF/CNPJ do cliente:',
    )

    if (documento === null) {
      focarCodigo()
      return
    }

    const documentoLimpo = normalizarDocumento(documento)

    if (!documentoLimpo) {
      setClienteVenda(null)
      recalcularItensCliente(null)
      focarCodigo()
      return
    }

    try {
      const resposta = await fetch(\`\${API_URL}/api/clientes\`, {
        headers: {
          Authorization: \`Bearer \${tokenAcesso}\`,
        },
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível consultar clientes.',
        )
      }

      const clientes = Array.isArray(dados.clientes)
        ? dados.clientes
        : []

      const cliente = clientes.find((item) => {
        const documentoCliente =
          item.cpfCnpj ??
          item.cpf_cnpj ??
          item.documento ??
          ''

        return (
          normalizarDocumento(documentoCliente) ===
          documentoLimpo
        )
      })

      if (!cliente) {
        alert('Cliente não encontrado.')
        focarCodigo()
        return
      }

      if (cliente.ativo === false) {
        alert('Cliente inativo.')
        focarCodigo()
        return
      }

      setClienteVenda(cliente)
      recalcularItensCliente(cliente)

      alert(
        \`CLIENTE IDENTIFICADO\\n\\n\` +
        \`\${cliente.nome || 'Cliente'}\\n\` +
        \`Clube Estação: \${cliente.clube === true ? 'SIM' : 'NÃO'}\`,
      )

      focarCodigo()
    } catch (erro) {
      console.error('Erro ao identificar cliente:', erro)
      alert(erro.message || 'Erro ao consultar cliente.')
      focarCodigo()
    }
  }

  function adicionarProduto(produto) {`,
'funções Clube'
)

/* PREÇO */
uma(
`    const preco = Number(produto.preco || 0)`,
`    const preco = obterPrecoProduto(produto)`,
'preço Clube'
)

/* CLIENTE NO BACKEND */
uma(
`          clienteId: null,`,
`          clienteId: clienteVenda?.id
            ? Number(clienteVenda.id)
            : null,`,
'clienteId'
)

/* F7 */
uma(
`        case 'F8':`,
`        case 'F7':
          evento.preventDefault()
          identificarCliente()
          break

        case 'F8':`,
'atalho F7'
)

/* CLIENTE NA TELA */
uma(
`                Operador: {nomeOperador}`,
`                Operador: {nomeOperador}
              </strong>

              <div
                style={{
                  marginTop: '6px',
                  fontWeight: '700',
                  color:
                    clienteVenda?.clube === true
                      ? '#22c55e'
                      : 'inherit',
                }}
              >
                {clienteVenda
                  ? \`Cliente: \${clienteVenda.nome || 'Cliente'}\`
                  : 'Cliente: não identificado'}

                {clienteVenda?.clube === true
                  ? ' • ★ CLUBE ESTAÇÃO'
                  : ''}
              </div>

              <strong style={{ display: 'none' }}>`,
'cliente visual'
)

/* BOTÃO F7 */
uma(
`          className="ec-pdv-atalho-sangria"`,
`          onClick={identificarCliente}
        >
          <kbd>F7</kbd>
          Cliente
        </button>

        <button
          type="button"
          className="ec-pdv-atalho-sangria"`,
'botão F7'
)

/* VALIDAÇÃO */
const testes = [
  'const [clienteVenda, setClienteVenda]',
  'function identificarCliente()',
  'function obterPrecoProduto',
  'const preco = obterPrecoProduto(produto)',
  'clienteId: clienteVenda?.id',
  "case 'F7':",
  '<kbd>F7</kbd>',
  '★ CLUBE ESTAÇÃO',
]

for (const teste of testes) {
  if (!codigo.includes(teste)) {
    console.error(`ERRO FINAL: ${teste}`)
    console.error('NADA FOI SALVO.')
    process.exit(1)
  }
}

fs.writeFileSync(arquivo, codigo, 'utf8')
console.log('')
console.log('PATCH V4 GRAVADO')
