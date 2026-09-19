const fs = require('fs')

const arquivo = 'src/components/pdv/Pdv.jsx'
const backup = 'src/components/pdv/Pdv.jsx.bak-clube-final2'

let codigo = fs.readFileSync(arquivo, 'utf8')

function trocar(antigo, novo, quantidade, nome) {
  const n = codigo.split(antigo).length - 1

  if (n !== quantidade) {
    console.error(`ERRO ${nome}: esperado ${quantidade}, encontrado ${n}`)
    console.error('PATCH CANCELADO SEM SALVAR.')
    process.exit(1)
  }

  codigo = codigo.split(antigo).join(novo)
  console.log(`OK: ${nome}`)
}

/* =========================================================
   1. ESTADO DO CLIENTE
========================================================= */

trocar(
`  const [produtos, setProdutos] = useState([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)`,
`  const [produtos, setProdutos] = useState([])
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)

  // CLIENTE / CLUBE ESTAÇÃO
  const [clienteVenda, setClienteVenda] = useState(null)`,
1,
'estado cliente'
)

/* =========================================================
   2. FUNÇÕES CLUBE
========================================================= */

trocar(
`  function adicionarProduto(produto) {`,
`  function normalizarDocumento(valor) {
    return String(valor || '').replace(/\\D/g, '')
  }

  function produtoTemClube(produto) {
    return Boolean(
      produto?.clubeAtivo ??
      produto?.clube_ativo ??
      false
    )
  }

  function obterPrecoProduto(produto, cliente = clienteVenda) {
    const clienteClube = cliente?.clube === true

    const precoClube =
      produto?.precoClube ??
      produto?.preco_clube

    if (
      clienteClube &&
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
    setItens((itensAtuais) =>
      itensAtuais.map((item) => {
        const produto = produtos.find(
          (p) => Number(p.id) === Number(item.produtoId || item.id),
        )

        if (!produto) {
          return item
        }

        return {
          ...item,
          preco: obterPrecoProduto(produto, cliente),
        }
      }),
    )

    setProdutoAtual((atual) => {
      if (!atual?.id) {
        return atual
      }

      const produto = produtos.find(
        (p) => Number(p.id) === Number(atual.id),
      )

      if (!produto) {
        return atual
      }

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
        ? 'Digite CPF/CNPJ do cliente.\\n\\nDeixe vazio para remover o cliente atual.'
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
1,
'funções Clube'
)

/* =========================================================
   3. PREÇO AUTOMÁTICO
========================================================= */

trocar(
`    const preco = Number(produto.preco || 0)`,
`    const preco = obterPrecoProduto(produto)`,
1,
'preço Clube automático'
)

/* =========================================================
   4. CLIENTE ID PARA O BACKEND
========================================================= */

trocar(
`          clienteId: null,
          formaPagamento,`,
`          clienteId: clienteVenda?.id
            ? Number(clienteVenda.id)
            : null,
          formaPagamento,`,
1,
'clienteId da venda'
)

/* =========================================================
   5. LIMPAR CLIENTE APÓS VENDA
========================================================= */

trocar(
`      setItens([])
      setCodigo('')

      setProdutoAtual({`,
`      setItens([])
      setCodigo('')
      setClienteVenda(null)

      setProdutoAtual({`,
1,
'limpar cliente após venda'
)

/* =========================================================
   6. LIMPAR CLIENTE AO CANCELAR
   Há outro setItens([]), então ancoramos na função.
========================================================= */

trocar(
`    setItens([])
    setCodigo('')

    setProdutoAtual({
      id: null,
      nome: 'AGUARDANDO PRODUTO',`,
`    setItens([])
    setCodigo('')
    setClienteVenda(null)

    setProdutoAtual({
      id: null,
      nome: 'AGUARDANDO PRODUTO',`,
1,
'limpar cliente no cancelamento'
)

/* =========================================================
   7. ATALHO F7
========================================================= */

trocar(
`        case 'F8':
          evento.preventDefault()
          abrirSangria()
          break`,
`        case 'F7':
          evento.preventDefault()
          identificarCliente()
          break

        case 'F8':
          evento.preventDefault()
          abrirSangria()
          break`,
1,
'atalho F7'
)

/* =========================================================
   8. DEPENDÊNCIA DO CLIENTE
========================================================= */

trocar(
`    processandoVenda,
    caixaAtual,
  ])`,
`    processandoVenda,
    caixaAtual,
    clienteVenda,
  ])`,
1,
'dependência cliente'
)

/* =========================================================
   9. MOSTRAR CLIENTE NO ATENDIMENTO
========================================================= */

trocar(
`              <strong>
                Operador: {nomeOperador}
              </strong>

              <div className="ec-pdv-info-venda">`,
`              <strong>
                Operador: {nomeOperador}
              </strong>

              <div
                style={{
                  marginTop: '7px',
                  padding: '7px 9px',
                  borderRadius: '6px',
                  background:
                    clienteVenda?.clube === true
                      ? '#e8fff1'
                      : '#eef4fa',
                  color:
                    clienteVenda?.clube === true
                      ? '#08783e'
                      : '#18354d',
                  fontSize: '13px',
                  fontWeight: '700',
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
              </div>

              <div className="ec-pdv-info-venda">`,
1,
'identificação visual'
)

/* =========================================================
   10. BOTÃO F7
========================================================= */

trocar(
`        <button
          type="button"
          className="ec-pdv-atalho-sangria"
          onClick={abrirSangria}
        >
          <kbd>F8</kbd>
          Sangria
        </button>`,
`        <button
          type="button"
          onClick={identificarCliente}
          style={{
            borderColor: clienteVenda?.clube === true
              ? '#16a34a'
              : undefined,
            fontWeight: '800',
          }}
        >
          <kbd>F7</kbd>
          {clienteVenda ? 'Cliente' : 'Identificar'}
        </button>

        <button
          type="button"
          className="ec-pdv-atalho-sangria"
          onClick={abrirSangria}
        >
          <kbd>F8</kbd>
          Sangria
        </button>`,
1,
'botão F7'
)

/* =========================================================
   VALIDAÇÃO
========================================================= */

const obrigatorios = [
  'const [clienteVenda, setClienteVenda]',
  'function identificarCliente()',
  'function obterPrecoProduto',
  'clienteId: clienteVenda?.id',
  "case 'F7':",
  '<kbd>F7</kbd>',
  'CLUBE ESTAÇÃO',
]

for (const trecho of obrigatorios) {
  if (!codigo.includes(trecho)) {
    console.error('ERRO NA VALIDAÇÃO:', trecho)
    console.error('PATCH NÃO SERÁ SALVO.')
    process.exit(1)
  }
}

fs.writeFileSync(arquivo, codigo, 'utf8')

console.log('')
console.log('PDV CLUBE PATCH CONCLUÍDO')
