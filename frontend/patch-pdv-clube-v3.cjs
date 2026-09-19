const fs = require('fs')

const arquivo = 'src/components/pdv/Pdv.jsx'
let codigo = fs.readFileSync(arquivo, 'utf8')

function trocarRegex(regex, novo, nome) {
  const matches = codigo.match(regex)
  const quantidade = matches ? matches.length : 0

  if (quantidade !== 1) {
    console.error(`ERRO ${nome}: encontrado ${quantidade} vez(es)`)
    console.error('NADA FOI SALVO.')
    process.exit(1)
  }

  codigo = codigo.replace(regex, novo)
  console.log(`OK: ${nome}`)
}

/* 1 - estado cliente */
trocarRegex(
  /(\s*const \[carregandoProdutos,\s*setCarregandoProdutos\]\s*=\s*useState\(true\))/,
  `$1

  // CLIENTE / CLUBE ESTAÇÃO
  const [clienteVenda, setClienteVenda] = useState(null)`,
  'estado cliente',
)

/* 2 - funções Clube antes de adicionarProduto */
trocarRegex(
  /(\s*)function adicionarProduto\(produto\)\s*\{/,
  `$1function normalizarDocumento(valor) {
    return String(valor || '').replace(/\\\\D/g, '')
  }

  function produtoTemClube(produto) {
    return Boolean(
      produto?.clubeAtivo ??
      produto?.clube_ativo ??
      false
    )
  }

  function obterPrecoProduto(produto, cliente = clienteVenda) {
    const precoClube =
      produto?.precoClube ??
      produto?.preco_clube

    if (
      cliente?.clube === true &&
      produtoTemClube(produto) &&
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
        ? 'Digite CPF/CNPJ do cliente.\\\\n\\\\nDeixe vazio para remover o cliente atual.'
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
          dados.erro || 'Não foi possível consultar os clientes.',
        )
      }

      const clientes = Array.isArray(dados.clientes)
        ? dados.clientes
        : []

      const cliente = clientes.find((item) => {
        const cpfCnpj =
          item.cpfCnpj ??
          item.cpf_cnpj ??
          item.documento ??
          ''

        return normalizarDocumento(cpfCnpj) === documentoLimpo
      })

      if (!cliente) {
        alert('Cliente não encontrado.')
        focarCodigo()
        return
      }

      if (cliente.ativo === false) {
        alert('Este cliente está inativo.')
        focarCodigo()
        return
      }

      setClienteVenda(cliente)
      recalcularItensCliente(cliente)

      alert(
        \`CLIENTE IDENTIFICADO\\\\n\\\\n\` +
        \`\${cliente.nome || 'Cliente'}\\\\n\` +
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
  'funções Clube',
)

/* 3 - preço */
trocarRegex(
  /const preco\s*=\s*Number\(produto\.preco\s*\|\|\s*0\)/,
  `const preco = obterPrecoProduto(produto)`,
  'preço automático',
)

/* 4 - clienteId */
trocarRegex(
  /clienteId:\s*null,\s*\n(\s*)formaPagamento,/,
  `clienteId: clienteVenda?.id
            ? Number(clienteVenda.id)
            : null,
          formaPagamento,`,
  'clienteId backend',
)

/* 5 - F7 */
trocarRegex(
  /(\s*)case 'F8':\s*\n\s*evento\.preventDefault\(\)\s*\n\s*abrirSangria\(\)\s*\n\s*break/,
  `$1case 'F7':
          evento.preventDefault()
          identificarCliente()
          break

        case 'F8':
          evento.preventDefault()
          abrirSangria()
          break`,
  'atalho F7',
)

/* 6 - botão F7 antes do F8 */
trocarRegex(
  /(\s*)(<button\s*\n\s*type="button"\s*\n\s*className="ec-pdv-atalho-sangria"\s*\n\s*onClick=\{abrirSangria\})/,
  `$1<button
          type="button"
          onClick={identificarCliente}
          style={{
            borderColor:
              clienteVenda?.clube === true
                ? '#16a34a'
                : undefined,
            fontWeight: '800',
          }}
        >
          <kbd>F7</kbd>
          {clienteVenda ? 'Cliente' : 'Identificar'}
        </button>

        $2`,
  'botão F7',
)

/* 7 - exibição do cliente */
trocarRegex(
  /(<strong>\s*Operador:\s*\{nomeOperador\}\s*<\/strong>)/,
  `$1

              <div
                style={{
                  marginTop: '7px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color:
                    clienteVenda?.clube === true
                      ? '#16a34a'
                      : 'inherit',
                }}
              >
                {clienteVenda
                  ? (
                    <>
                      Cliente: {clienteVenda.nome || 'Cliente'}
                      {clienteVenda.clube === true
                        ? ' • ★ CLUBE ESTAÇÃO'
                        : ''}
                    </>
                  )
                  : 'Cliente: não identificado'}
              </div>`,
  'cliente na tela',
)

/* validação antes de gravar */
const obrigatorios = [
  'const [clienteVenda, setClienteVenda]',
  'function identificarCliente()',
  'function obterPrecoProduto',
  'clienteId: clienteVenda?.id',
  "case 'F7':",
  '<kbd>F7</kbd>',
  '★ CLUBE ESTAÇÃO',
]

for (const item of obrigatorios) {
  if (!codigo.includes(item)) {
    console.error(`ERRO validação final: ${item}`)
    console.error('NADA FOI SALVO.')
    process.exit(1)
  }
}

fs.writeFileSync(arquivo, codigo, 'utf8')

console.log('')
console.log('PATCH PDV CLUBE GRAVADO COM SUCESSO')
