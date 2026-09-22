import { useEffect, useMemo, useRef, useState } from 'react'
import './Pdv.css'

const API_URL = 'http://localhost:3000'
const TERMINAL = '001'

function Pdv({ usuario, token, onSair }) {
  const campoCodigoRef = useRef(null)

  const [codigo, setCodigo] = useState('')
  const [itens, setItens] = useState([])
  const [produtos, setProdutos] = useState([])

  // CLIENTE / CLUBE ESTAÇÃO
  const [clienteVenda, setClienteVenda] = useState(null)
  const [carregandoProdutos, setCarregandoProdutos] = useState(true)

  const [produtoAtual, setProdutoAtual] = useState({
    id: null,
    nome: 'AGUARDANDO PRODUTO',
    quantidade: 0,
    precoUnitario: 0,
    total: 0,
  })

  // CAIXA
  const [caixaAtual, setCaixaAtual] = useState(null)
  const [carregandoCaixa, setCarregandoCaixa] = useState(true)
  const [modalAbertura, setModalAbertura] = useState(false)
  const [valorInicial, setValorInicial] = useState('')
  const [erroCaixa, setErroCaixa] = useState('')
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)

  // PAGAMENTO
  const [modalPagamento, setModalPagamento] = useState(false)
  const [formaPagamento, setFormaPagamento] = useState('')
  const [valorRecebido, setValorRecebido] = useState('')
  const [processandoVenda, setProcessandoVenda] = useState(false)
  const [erroPagamento, setErroPagamento] = useState('')

  // PAGAMENTO MISTO
  const [pagamentosMistos, setPagamentosMistos] = useState({
    Dinheiro: '',
    Pix: '',
    'Cartão de débito': '',
    'Cartão de crédito': '',
  })

  // SANGRIA
  const [modalSangria, setModalSangria] = useState(false)
  const [gestorAutorizado, setGestorAutorizado] = useState(false)
  const [tokenGestor, setTokenGestor] = useState('')
  const [emailGestor, setEmailGestor] = useState('')
  const [senhaGestor, setSenhaGestor] = useState('')
  const [erroGestor, setErroGestor] = useState('')
  const [validandoGestor, setValidandoGestor] = useState(false)
  const [processandoSangria, setProcessandoSangria] = useState(false)
  const [valorSangria, setValorSangria] = useState('')
  const [motivoSangria, setMotivoSangria] = useState(
    'Retirada de numerário',
  )

  // FECHAMENTO DE CAIXA
  const [modalFechamento, setModalFechamento] = useState(false)
  const [valorFechamento, setValorFechamento] = useState('')
  const [erroFechamento, setErroFechamento] = useState('')
  const [fechandoCaixa, setFechandoCaixa] = useState(false)
  const [relatorioFechamento, setRelatorioFechamento] = useState(null)

  const tokenAcesso =
    token || localStorage.getItem('estacaocloud-token') || ''

  const nomeOperador =
    usuario?.nome ||
    usuario?.name ||
    usuario?.email ||
    'Operador'

  const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  function converterValor(valor) {
    if (typeof valor === 'number') {
      return valor
    }

    let texto = String(valor || '').trim()

    if (!texto) {
      return 0
    }

    texto = texto.replace(/[R$\s]/g, '')

    if (texto.includes(',')) {
      texto = texto.replace(/\./g, '').replace(',', '.')
    }

    const numero = Number(texto)

    return Number.isFinite(numero) ? numero : 0
  }

  const totalVenda = useMemo(() => {
    return itens.reduce((total, item) => {
      return (
        total +
        Number(item.quantidade || 0) *
          Number(item.preco || 0)
      )
    }, 0)
  }, [itens])

  const quantidadeItens = useMemo(() => {
    return itens.reduce((total, item) => {
      return total + Number(item.quantidade || 0)
    }, 0)
  }, [itens])

  const troco = useMemo(() => {
    if (formaPagamento !== 'Dinheiro') {
      return 0
    }

    const recebido = converterValor(valorRecebido)

    if (recebido <= totalVenda) {
      return 0
    }

    return recebido - totalVenda
  }, [formaPagamento, valorRecebido, totalVenda])

  function focarCodigo() {
    setTimeout(() => {
      if (!modalAbertura && caixaAtual) {
        campoCodigoRef.current?.focus()
      }
    }, 50)
  }

  async function carregarCaixaAtual() {
    try {
      setCarregandoCaixa(true)
      setErroCaixa('')

      const resposta = await fetch(
        `${API_URL}/api/caixa/atual?terminal=${TERMINAL}`,
        {
          headers: {
            Authorization: `Bearer ${tokenAcesso}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível consultar o caixa.',
        )
      }

      if (dados.aberto && dados.caixa) {
        setCaixaAtual(dados.caixa)
        setModalAbertura(false)
      } else {
        setCaixaAtual(null)
        setModalAbertura(true)
      }
    } catch (erro) {
      console.error('Erro ao consultar caixa:', erro)
      setCaixaAtual(null)
      setModalAbertura(true)
      setErroCaixa(
        erro.message || 'Não foi possível consultar o caixa.',
      )
    } finally {
      setCarregandoCaixa(false)
    }
  }

  async function abrirCaixa(evento) {
    evento.preventDefault()

    const valor = converterValor(valorInicial)

    if (!Number.isFinite(valor) || valor < 0) {
      setErroCaixa('Informe um fundo inicial válido.')
      return
    }

    try {
      setAbrindoCaixa(true)
      setErroCaixa('')

      const resposta = await fetch(`${API_URL}/api/caixa/abrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAcesso}`,
        },
        body: JSON.stringify({
          terminal: TERMINAL,
          valorInicial: valor,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível abrir o caixa.',
        )
      }

      setCaixaAtual(dados.caixa)
      setModalAbertura(false)
      setValorInicial('')
      setErroCaixa('')

      alert(
        `CAIXA ${TERMINAL} ABERTO COM SUCESSO!\n\nFundo inicial: ${formatarMoeda(
          dados.caixa?.valorInicial || valor,
        )}`,
      )

      focarCodigo()
    } catch (erro) {
      console.error('Erro ao abrir caixa:', erro)
      setErroCaixa(
        erro.message || 'Não foi possível abrir o caixa.',
      )
    } finally {
      setAbrindoCaixa(false)
    }
  }

  async function carregarProdutos() {
    try {
      setCarregandoProdutos(true)

      const resposta = await fetch(`${API_URL}/api/produtos`, {
        headers: {
          Authorization: `Bearer ${tokenAcesso}`,
        },
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível carregar os produtos.',
        )
      }

      setProdutos(
        Array.isArray(dados.produtos) ? dados.produtos : [],
      )
    } catch (erro) {
      console.error('Erro ao carregar produtos:', erro)

      alert(
        `Erro ao carregar produtos do caixa.\n\n${erro.message}`,
      )
    } finally {
      setCarregandoProdutos(false)
      focarCodigo()
    }
  }

  function normalizarDocumento(valor) {
    return String(valor || '').replace(/\D/g, '')
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
      const resposta = await fetch(`${API_URL}/api/clientes`, {
        headers: {
          Authorization: `Bearer ${tokenAcesso}`,
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
        `CLIENTE IDENTIFICADO\n\n` +
        `${cliente.nome || 'Cliente'}\n` +
        `Clube Estação: ${cliente.clube === true ? 'SIM' : 'NÃO'}`,
      )

      focarCodigo()
    } catch (erro) {
      console.error('Erro ao identificar cliente:', erro)
      alert(erro.message || 'Erro ao consultar cliente.')
      focarCodigo()
    }
  }

  function adicionarProduto(produto) {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    if (!produto) {
      return
    }

    if (produto.ativo === false) {
      alert('Este produto está inativo.')
      focarCodigo()
      return
    }

    const estoqueDisponivel = Number(produto.estoque || 0)

    if (estoqueDisponivel <= 0) {
      alert(`Produto sem estoque:\n${produto.nome}`)
      focarCodigo()
      return
    }

    const itemExistente = itens.find(
      (item) => Number(item.id) === Number(produto.id),
    )

    const quantidadeAtual = Number(
      itemExistente?.quantidade || 0,
    )

    const novaQuantidade = quantidadeAtual + 1

    if (novaQuantidade > estoqueDisponivel) {
      alert(
        `Estoque insuficiente.\n\nProduto: ${produto.nome}\nDisponível: ${estoqueDisponivel}`,
      )
      focarCodigo()
      return
    }

    const preco = obterPrecoProduto(produto)

    setItens((itensAtuais) => {
      const indice = itensAtuais.findIndex(
        (item) => Number(item.id) === Number(produto.id),
      )

      if (indice >= 0) {
        return itensAtuais.map((item, index) => {
          if (index !== indice) {
            return item
          }

          return {
            ...item,
            quantidade: Number(item.quantidade) + 1,
          }
        })
      }

      return [
        ...itensAtuais,
        {
          id: produto.id,
          produtoId: produto.id,
          codigoBarras: produto.codigoBarras,
          nome: produto.nome,
          quantidade: 1,
          preco,
          estoqueDisponivel,
        },
      ]
    })

    setProdutoAtual({
      id: produto.id,
      nome: produto.nome,
      quantidade: novaQuantidade,
      precoUnitario: preco,
      total: novaQuantidade * preco,
    })

    setCodigo('')
    focarCodigo()
  }

  async function buscarProdutoPorCodigo(codigoInformado) {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    const codigoLimpo = String(codigoInformado || '').trim()

    if (!codigoLimpo) {
      return
    }

    try {
      const resposta = await fetch(
        `${API_URL}/api/produtos/buscar/codigo/${encodeURIComponent(codigoLimpo)}`,
        {
          headers: {
            Authorization: `Bearer ${tokenAcesso}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Produto não encontrado.',
        )
      }

      if (!dados.produto) {
        throw new Error('Produto não encontrado.')
      }

      adicionarProduto(dados.produto)
    } catch (erro) {
      alert(
        `${erro.message}\n\nCódigo / PLU: ${codigoLimpo}`,
      )

      setCodigo('')
      focarCodigo()
    }
  }

  async function tratarCodigo(evento) {
    evento.preventDefault()

    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    if (!codigo.trim()) {
      focarCodigo()
      return
    }

    await buscarProdutoPorCodigo(codigo)
  }

  function consultarProduto() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    const pesquisa = window.prompt(
      'Digite o código de barras ou parte do nome do produto:',
    )

    if (!pesquisa) {
      focarCodigo()
      return
    }

    const termo = pesquisa.trim().toLowerCase()

    const encontrados = produtos.filter((produto) => {
      const codigoProduto = String(
        produto.codigoBarras || '',
      ).toLowerCase()

      const nomeProduto = String(
        produto.nome || '',
      ).toLowerCase()

      return (
        codigoProduto.includes(termo) ||
        nomeProduto.includes(termo)
      )
    })

    if (encontrados.length === 0) {
      alert('Nenhum produto encontrado.')
      focarCodigo()
      return
    }

    const produto = encontrados[0]

    alert(
      `PRODUTO\n\n` +
        `Nome: ${produto.nome}\n` +
        `Código: ${produto.codigoBarras}\n` +
        `Preço: ${formatarMoeda(produto.preco)}\n` +
        `Estoque: ${produto.estoque}`,
    )

    focarCodigo()
  }

  function alterarQuantidade() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    if (itens.length === 0) {
      alert('Nenhum produto lançado.')
      focarCodigo()
      return
    }

    const ultimoItem = itens[itens.length - 1]

    const novaQuantidadeTexto = window.prompt(
      `Quantidade para:\n${ultimoItem.nome}`,
      String(ultimoItem.quantidade),
    )

    if (novaQuantidadeTexto === null) {
      focarCodigo()
      return
    }

    const novaQuantidade = converterValor(novaQuantidadeTexto)

    if (
      !Number.isFinite(novaQuantidade) ||
      novaQuantidade <= 0
    ) {
      alert('Informe uma quantidade válida.')
      focarCodigo()
      return
    }

    if (
      novaQuantidade >
      Number(ultimoItem.estoqueDisponivel || 0)
    ) {
      alert(
        `Estoque insuficiente.\n\nDisponível: ${ultimoItem.estoqueDisponivel}`,
      )

      focarCodigo()
      return
    }

    setItens((itensAtuais) =>
      itensAtuais.map((item) =>
        Number(item.id) === Number(ultimoItem.id)
          ? {
              ...item,
              quantidade: novaQuantidade,
            }
          : item,
      ),
    )

    setProdutoAtual({
      id: ultimoItem.id,
      nome: ultimoItem.nome,
      quantidade: novaQuantidade,
      precoUnitario: Number(ultimoItem.preco),
      total:
        novaQuantidade * Number(ultimoItem.preco),
    })

    focarCodigo()
  }

  function aplicarDesconto() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    alert(
      'O desconto será conectado ao controle de permissões.',
    )

    focarCodigo()
  }

  // ==============================
  // PAGAMENTO
  // ==============================

  function abrirPagamento() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    if (itens.length === 0) {
      alert('Nenhum produto lançado na venda.')
      focarCodigo()
      return
    }

    setFormaPagamento('')
    setValorRecebido('')
    setErroPagamento('')
    setModalPagamento(true)
  }

  function fecharPagamento() {
    if (processandoVenda) {
      return
    }

    setModalPagamento(false)
    setFormaPagamento('')
    setValorRecebido('')
    setErroPagamento('')

    focarCodigo()
  }

  async function confirmarPagamento() {
    if (!caixaAtual) {
      setModalPagamento(false)
      setModalAbertura(true)
      return
    }

    if (!formaPagamento) {
      setErroPagamento('Selecione a forma de pagamento.')
      return
    }

    if (formaPagamento === 'Dinheiro') {
      const recebido = converterValor(valorRecebido)

      if (recebido < totalVenda) {
        setErroPagamento(
          'Valor recebido é menor que o total da venda.',
        )
        return
      }
    }

    let pagamentosVenda = []

    if (formaPagamento === 'Pagamento Misto') {
      pagamentosVenda = Object.entries(pagamentosMistos)
        .map(([forma, valor]) => ({
          formaPagamento: forma,
          valor: converterValor(valor),
        }))
        .filter((parcela) => parcela.valor > 0)

      if (pagamentosVenda.length < 2) {
        setErroPagamento(
          'Informe pelo menos duas formas de pagamento.',
        )
        return
      }

      const totalPagamentosCentavos =
        pagamentosVenda.reduce(
          (soma, parcela) =>
            soma + Math.round(parcela.valor * 100),
          0,
        )

      const totalVendaCentavos =
        Math.round(totalVenda * 100)

      if (totalPagamentosCentavos !== totalVendaCentavos) {
        const diferenca =
          (totalVendaCentavos - totalPagamentosCentavos) / 100

        setErroPagamento(
          diferenca > 0
            ? `Falta ${formatarMoeda(diferenca)} para completar o pagamento.`
            : `O pagamento excede o total em ${formatarMoeda(
                Math.abs(diferenca),
              )}.`,
        )
        return
      }
    }

    setProcessandoVenda(true)
    setErroPagamento('')

    try {
      const itensVenda = itens.map((item) => ({
        produtoId: Number(item.produtoId),
        quantidade: Number(item.quantidade),
      }))

      const resposta = await fetch(`${API_URL}/api/vendas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAcesso}`,
        },
        body: JSON.stringify({
          itens: itensVenda,
          clienteId: clienteVenda?.id
            ? Number(clienteVenda.id)
            : null,
          formaPagamento,
          pagamentos:
            formaPagamento === 'Pagamento Misto'
              ? pagamentosVenda
              : undefined,
          desconto: 0,
          terminal: TERMINAL,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        if (
          resposta.status === 409 &&
          String(dados.erro || '')
            .toLowerCase()
            .includes('não está aberto')
        ) {
          setCaixaAtual(null)
          setModalPagamento(false)
          setModalAbertura(true)
        }

        throw new Error(
          dados.erro || 'Não foi possível finalizar a venda.',
        )
      }

      const venda = dados.venda

      let mensagem =
        `VENDA CONCLUÍDA!\n\n` +
        `Venda nº: ${venda?.id || '-'}\n` +
        `Caixa: ${venda?.terminal || TERMINAL}\n` +
        `Total: ${formatarMoeda(venda?.total || totalVenda)}\n` +
        `Pagamento: ${formaPagamento}`

      if (formaPagamento === 'Dinheiro') {
        mensagem +=
          `\nRecebido: ${formatarMoeda(
            converterValor(valorRecebido),
          )}` +
          `\nTroco: ${formatarMoeda(troco)}`
      }

      alert(mensagem)

      setModalPagamento(false)
      setFormaPagamento('')
      setValorRecebido('')
      setErroPagamento('')

      setItens([])
      setCodigo('')

      setProdutoAtual({
        id: null,
        nome: 'AGUARDANDO PRODUTO',
        quantidade: 0,
        precoUnitario: 0,
        total: 0,
      })

      await carregarProdutos()

      focarCodigo()
    } catch (erro) {
      console.error('Erro ao finalizar venda:', erro)

      setErroPagamento(
        erro.message || 'Erro ao finalizar venda.',
      )
    } finally {
      setProcessandoVenda(false)
    }
  }

  function cancelarVenda() {
    if (itens.length === 0) {
      focarCodigo()
      return
    }

    const confirmou = window.confirm(
      'Deseja cancelar a venda atual?',
    )

    if (!confirmou) {
      focarCodigo()
      return
    }

    setItens([])
    setCodigo('')

    setProdutoAtual({
      id: null,
      nome: 'AGUARDANDO PRODUTO',
      quantidade: 0,
      precoUnitario: 0,
      total: 0,
    })

    focarCodigo()
  }

  // ==============================
  // SANGRIA
  // ==============================

  function fecharSangria() {
    setModalSangria(false)
    setGestorAutorizado(false)
    setTokenGestor('')
    setEmailGestor('')
    setSenhaGestor('')
    setErroGestor('')
    setValorSangria('')
    setMotivoSangria('Retirada de numerário')

    focarCodigo()
  }

  function abrirSangria() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    setGestorAutorizado(false)
    setTokenGestor('')
    setErroGestor('')
    setEmailGestor('')
    setSenhaGestor('')
    setValorSangria('')
    setModalSangria(true)
  }

  async function autorizarGestor(evento) {
    evento.preventDefault()

    if (!emailGestor.trim() || !senhaGestor) {
      setErroGestor(
        'Informe o login e a senha do gestor.',
      )
      return
    }

    setValidandoGestor(true)
    setErroGestor('')

    try {
      const resposta = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: emailGestor.trim(),
            senha: senhaGestor,
          }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErroGestor(
          dados.erro || 'Credenciais inválidas.',
        )
        return
      }

      const perfil = String(
        dados.usuario?.perfil ||
          dados.usuario?.tipo ||
          dados.usuario?.role ||
          '',
      ).toLowerCase()

      const perfilGestor =
        perfil.includes('admin') ||
        perfil.includes('gerente') ||
        perfil.includes('gestor')

      const usuarioTesteGestor =
        !perfil &&
        String(
          dados.usuario?.email || '',
        ).toLowerCase() ===
          'admin@estacaocloud.local'

      if (!perfilGestor && !usuarioTesteGestor) {
        setErroGestor(
          'Somente gerente, gestor ou administrador pode autorizar sangria.',
        )
        return
      }

      if (!dados.token) {
        setErroGestor(
          'O servidor não retornou o token de autorização do gestor.',
        )
        return
      }

      setTokenGestor(dados.token)
      setGestorAutorizado(true)
      setSenhaGestor('')
    } catch (erro) {
      console.error(
        'Erro ao autorizar gestor:',
        erro,
      )

      setErroGestor(
        'Não foi possível validar o gestor no servidor.',
      )
    } finally {
      setValidandoGestor(false)
    }
  }

  async function confirmarSangria(evento) {
    evento.preventDefault()

    const valor = converterValor(valorSangria)

    if (!Number.isFinite(valor) || valor <= 0) {
      setErroGestor(
        'Informe um valor válido para a sangria.',
      )
      return
    }

    if (!tokenGestor) {
      setErroGestor(
        'A autorização do gestor expirou. Autorize novamente.',
      )
      setGestorAutorizado(false)
      return
    }

    try {
      setProcessandoSangria(true)
      setErroGestor('')

      const resposta = await fetch(
        `${API_URL}/api/caixa/sangria`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenGestor}`,
          },
          body: JSON.stringify({
            terminal: TERMINAL,
            valor,
            motivo: motivoSangria,
          }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível registrar a sangria.',
        )
      }

      if (dados.caixa) {
        setCaixaAtual(dados.caixa)
      }

      alert(
        `SANGRIA REGISTRADA!\n\nCaixa: ${TERMINAL}\nValor: ${formatarMoeda(
          valor,
        )}\nMotivo: ${motivoSangria}`,
      )

      fecharSangria()
    } catch (erro) {
      console.error('Erro ao registrar sangria:', erro)
      setErroGestor(
        erro.message || 'Não foi possível registrar a sangria.',
      )
    } finally {
      setProcessandoSangria(false)
    }
  }

  // ==============================
  // FECHAMENTO DE CAIXA
  // ==============================

  function abrirFechamentoCaixa() {
    if (!caixaAtual) {
      setModalAbertura(true)
      return
    }

    if (itens.length > 0) {
      alert('Finalize ou cancele a venda atual antes de fechar o caixa.')
      focarCodigo()
      return
    }

    setValorFechamento('')
    setErroFechamento('')
    setModalFechamento(true)
  }

  function fecharModalFechamento() {
    if (fechandoCaixa) return

    setModalFechamento(false)
    setValorFechamento('')
    setErroFechamento('')
    focarCodigo()
  }

  async function confirmarFechamentoCaixa(evento) {
    evento.preventDefault()

    if (!caixaAtual) {
      setModalFechamento(false)
      setModalAbertura(true)
      return
    }

    const valorInformado = converterValor(valorFechamento)

    if (!Number.isFinite(valorInformado) || valorInformado < 0) {
      setErroFechamento('Informe um valor válido contado na gaveta.')
      return
    }

    try {
      setFechandoCaixa(true)
      setErroFechamento('')

      const resposta = await fetch(`${API_URL}/api/caixa/fechar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAcesso}`,
        },
        body: JSON.stringify({
          terminal: TERMINAL,
          valorInformado,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível fechar o caixa.',
        )
      }

      const caixaFechado = dados.caixa || {}

      setRelatorioFechamento({
        terminal: caixaFechado.terminal || TERMINAL,
        operador: nomeOperador,
        valorInicial: Number(caixaFechado.valorInicial || 0),
        totalVendas: Number(
          caixaFechado.totalVendas ??
            caixaFechado.vendasDinheiro ??
            caixaFechado.valorVendas ??
            0,
        ),
        totalSangrias: Number(
          caixaFechado.totalSangrias ??
            caixaFechado.sangrias ??
            caixaFechado.valorSangrias ??
            0,
        ),
        saldoTeorico: Number(caixaFechado.saldoTeorico || 0),
        valorContado: Number(
          caixaFechado.valorInformadoFechamento ?? valorInformado,
        ),
        diferenca: Number(caixaFechado.diferenca || 0),
        abertoEm:
          caixaFechado.abertoEm ||
          caixaFechado.dataAbertura ||
          caixaAtual?.abertoEm ||
          caixaAtual?.dataAbertura ||
          null,
        fechadoEm:
          caixaFechado.fechadoEm ||
          caixaFechado.dataFechamento ||
          new Date().toISOString(),
      })

      setCaixaAtual(null)
      setModalFechamento(false)
      setValorFechamento('')
      setErroFechamento('')
      setModalAbertura(true)
    } catch (erro) {
      console.error('Erro ao fechar caixa:', erro)
      setErroFechamento(
        erro.message || 'Não foi possível fechar o caixa.',
      )
    } finally {
      setFechandoCaixa(false)
    }
  }

  useEffect(() => {
    carregarProdutos()
    carregarCaixaAtual()
  }, [])

  useEffect(() => {
    function atalhos(evento) {
      if (modalAbertura) {
        return
      }

      if (relatorioFechamento) {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          setRelatorioFechamento(null)
        }

        return
      }

      if (modalPagamento) {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          fecharPagamento()
        }

        return
      }

      if (modalSangria) {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          fecharSangria()
        }

        return
      }

      if (modalFechamento) {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          fecharModalFechamento()
        }

        return
      }

      switch (evento.key) {
        case 'F2':
          evento.preventDefault()
          abrirPagamento()
          break

        case 'F3':
          evento.preventDefault()
          consultarProduto()
          break

        case 'F4':
          evento.preventDefault()
          alterarQuantidade()
          break

        case 'F6':
          evento.preventDefault()
          aplicarDesconto()
          break

        case 'F7':
          evento.preventDefault()
          identificarCliente()
          break

        case 'F8':
          evento.preventDefault()
          abrirSangria()
          break

        case 'F10':
          evento.preventDefault()
          abrirFechamentoCaixa()
          break

        case 'Escape':
          evento.preventDefault()
          cancelarVenda()
          break

        default:
          break
      }
    }

    window.addEventListener('keydown', atalhos)

    return () =>
      window.removeEventListener('keydown', atalhos)
  }, [
    modalAbertura,
    relatorioFechamento,
    modalSangria,
    modalFechamento,
    modalPagamento,
    itens,
    produtos,
    formaPagamento,
    valorRecebido,
    processandoVenda,
    caixaAtual,
  ])

  return (
    <div className="ec-pdv">
      <header className="ec-pdv-topbar">
        <div className="ec-pdv-marca">
          <div className="ec-pdv-logo">E</div>

          <div>
            <strong>EstaçãoCloud</strong>
            <span>PDV • Frente de Caixa</span>
          </div>
        </div>

        <div className="ec-pdv-caixa-aberto">
          <span
            className="ec-pdv-status-dot"
            style={{
              background: caixaAtual ? '#28d17c' : '#ef4444',
            }}
          />
          {carregandoCaixa
            ? 'VERIFICANDO CAIXA'
            : caixaAtual
              ? 'CAIXA ABERTO'
              : 'CAIXA FECHADO'}
        </div>

        <div className="ec-pdv-terminal">
          <span>CAIXA</span>
          <strong>{TERMINAL}</strong>
        </div>

        <button
          type="button"
          onClick={onSair}
          style={{
            position: 'absolute',
            right: '18px',
            top: '77px',
            zIndex: 5,
            border: '1px solid #36546f',
            background: '#0b2238',
            color: '#fff',
            borderRadius: '7px',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Sair do caixa
        </button>
      </header>

      <main className="ec-pdv-main">
        <aside className="ec-pdv-publicidade">
          <div className="ec-pdv-publicidade-conteudo">
            <div className="ec-pdv-publicidade-logo">
              Estação<strong>Cloud</strong>
            </div>

            <div className="ec-pdv-publicidade-texto">
              <span>CLUBE ESTAÇÃO</span>

              <h2>
                Obrigado
                <br />
                pela preferência!
              </h2>

              <p>
                Tecnologia, agilidade e uma experiência
                melhor para você.
              </p>
            </div>

            <div className="ec-pdv-oferta">
              <span>OFERTAS DO DIA</span>
              <strong>Clube Estação</strong>
              <small>Consulte o operador</small>
            </div>
          </div>
        </aside>

        <section className="ec-pdv-operacao">
          <section className="ec-pdv-produto-destaque">
            <div className="ec-pdv-produto-nome">
              <span>PRODUTO</span>
              <strong>{produtoAtual.nome}</strong>
            </div>

            <div className="ec-pdv-produto-valores">
              <div>
                <span>QUANTIDADE</span>

                <strong>
                  {Number(
                    produtoAtual.quantidade || 0,
                  ).toLocaleString('pt-BR', {
                    minimumFractionDigits: 3,
                  })}
                </strong>
              </div>

              <div>
                <span>PREÇO UNITÁRIO</span>

                <strong>
                  {formatarMoeda(
                    produtoAtual.precoUnitario,
                  )}
                </strong>
              </div>

              <div className="ec-pdv-preco-total-produto">
                <span>PREÇO TOTAL</span>

                <strong>
                  {formatarMoeda(produtoAtual.total)}
                </strong>
              </div>
            </div>
          </section>

          <form
            className="ec-pdv-leitura"
            onSubmit={tratarCodigo}
          >
            <span>CÓDIGO DE BARRAS / PRODUTO</span>

            <input
              ref={campoCodigoRef}
              value={codigo}
              onChange={(evento) =>
                setCodigo(evento.target.value)
              }
              placeholder={
                !caixaAtual
                  ? 'Abra o caixa para iniciar'
                  : carregandoProdutos
                    ? 'Carregando produtos...'
                    : 'Bipe o produto ou digite o código'
              }
              disabled={carregandoProdutos || !caixaAtual}
              autoComplete="off"
            />
          </form>

          <section className="ec-pdv-lista">
            <div className="ec-pdv-lista-cabecalho">
              <span>ITEM</span>
              <span>PRODUTO</span>
              <span>QTD.</span>
              <span>UNITÁRIO</span>
              <span>TOTAL</span>
            </div>

            <div className="ec-pdv-lista-corpo">
              {itens.length === 0 ? (
                <div className="ec-pdv-lista-vazia">
                  <div className="ec-pdv-carrinho-icone">
                    🛒
                  </div>

                  <strong>
                    {caixaAtual ? 'Caixa livre' : 'Caixa fechado'}
                  </strong>

                  <span>
                    {caixaAtual
                      ? 'Bipe o primeiro produto para iniciar a venda'
                      : 'Faça a abertura do caixa para começar o atendimento'}
                  </span>
                </div>
              ) : (
                itens.map((item, indice) => (
                  <div
                    className="ec-pdv-item"
                    key={item.id}
                  >
                    <span>{indice + 1}</span>
                    <strong>{item.nome}</strong>
                    <span>{item.quantidade}</span>

                    <span>
                      {formatarMoeda(item.preco)}
                    </span>

                    <strong>
                      {formatarMoeda(
                        Number(item.quantidade) *
                          Number(item.preco),
                      )}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="ec-pdv-base">
            <div className="ec-pdv-atendimento">
              <span>ATENDIMENTO</span>

              <strong>
                Operador: {nomeOperador}
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
                  ? `Cliente: ${clienteVenda.nome || 'Cliente'}`
                  : 'Cliente: não identificado'}

                {clienteVenda?.clube === true
                  ? ' • ★ CLUBE ESTAÇÃO'
                  : ''}
              </div>

              <strong style={{ display: 'none' }}>
              </strong>

              <div className="ec-pdv-info-venda">
                <span>
                  Itens: <b>{quantidadeItens}</b>
                </span>

                <span>
                  Desconto: <b>R$ 0,00</b>
                </span>
              </div>
            </div>

            <div className="ec-pdv-total-venda">
              <span>TOTAL</span>

              <strong>
                {formatarMoeda(totalVenda)}
              </strong>
            </div>
          </section>
        </section>
      </main>

      <footer className="ec-pdv-atalhos">
        <button type="button" onClick={abrirPagamento}>
          <kbd>F2</kbd>
          Finalizar
        </button>

        <button type="button" onClick={consultarProduto}>
          <kbd>F3</kbd>
          Consulta
        </button>

        <button type="button" onClick={alterarQuantidade}>
          <kbd>F4</kbd>
          Quantidade
        </button>

        <button type="button" onClick={aplicarDesconto}>
          <kbd>F6</kbd>
          Desconto
        </button>

        <button
          type="button"
          onClick={identificarCliente}
        >
          <kbd>F7</kbd>
          Cliente
        </button>

        <button
          type="button"
          className="ec-pdv-atalho-sangria"
          onClick={abrirSangria}
        >
          <kbd>F8</kbd>
          Sangria
        </button>

        <button
          type="button"
          onClick={abrirFechamentoCaixa}
          style={{
            borderColor: '#d7a527',
            background: '#6b4d08',
            color: '#fff',
            fontWeight: '800',
          }}
        >
          <kbd>F10</kbd>
          Fechar caixa
        </button>

        <button
          type="button"
          className="ec-pdv-atalho-cancelar"
          onClick={cancelarVenda}
        >
          <kbd>ESC</kbd>
          Cancelar
        </button>
      </footer>

      {modalAbertura && (
        <div className="ec-modal-overlay">
          <section
            className="ec-modal-sangria"
            style={{ maxWidth: '560px' }}
          >
            <div className="ec-modal-cabecalho">
              <div>
                <span>INÍCIO DE TURNO</span>
                <h2>Abertura do Caixa {TERMINAL}</h2>
              </div>
            </div>

            <div className="ec-autorizacao-aviso">
              <div className="ec-autorizacao-cadeado">💰</div>

              <div>
                <strong>Caixa fechado</strong>

                <p>
                  Informe o fundo inicial disponível na gaveta
                  para liberar as vendas deste terminal.
                </p>
              </div>
            </div>

            <form onSubmit={abrirCaixa}>
              <label className="ec-modal-campo">
                <span>Operador</span>

                <input
                  type="text"
                  value={nomeOperador}
                  disabled
                />
              </label>

              <label className="ec-modal-campo">
                <span>Fundo inicial / troco</span>

                <div className="ec-campo-moeda">
                  <b>R$</b>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorInicial}
                    onChange={(evento) => {
                      setValorInicial(evento.target.value)
                      setErroCaixa('')
                    }}
                    placeholder="0,00"
                    autoFocus
                  />
                </div>
              </label>

              {erroCaixa && (
                <div className="ec-modal-erro">
                  {erroCaixa}
                </div>
              )}

              <div className="ec-modal-acoes">
                <button
                  type="button"
                  className="ec-botao-secundario"
                  onClick={onSair}
                  disabled={abrindoCaixa}
                >
                  Sair do PDV
                </button>

                <button
                  type="submit"
                  className="ec-botao-principal"
                  disabled={abrindoCaixa}
                >
                  {abrindoCaixa
                    ? 'Abrindo caixa...'
                    : 'Abrir caixa'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {modalPagamento && (
        <div className="ec-modal-overlay">
          <section className="ec-pagamento-modal">

            <div className="ec-pagamento-header">
              <div>
                <span>FINALIZAÇÃO DA VENDA</span>
                <h2>Pagamento</h2>
                <p>Selecione a forma de pagamento para concluir a venda.</p>
              </div>

              <button
                type="button"
                className="ec-modal-fechar"
                onClick={fecharPagamento}
              >
                ×
              </button>
            </div>

            <div className="ec-pagamento-total">
              <span>TOTAL DA VENDA</span>
              <strong>{formatarMoeda(totalVenda)}</strong>
            </div>

            {formaPagamento !== 'Pagamento Misto' && (
            <div className="ec-pagamento-grid">
              {[
                { nome: 'Dinheiro', tipo: 'dinheiro', ativo: true },
                { nome: 'Pix', tipo: 'pix', ativo: true },
                { nome: 'Cartão de débito', tipo: 'debito', ativo: true },
                { nome: 'Cartão de crédito', tipo: 'credito', ativo: true },
                { nome: 'Vale Alimentação', tipo: 'vale', ativo: false },
                { nome: 'Vale Presente', tipo: 'presente', ativo: false },
                { nome: 'Outras Formas', tipo: 'outras', ativo: false },
                { nome: 'Pagamento Misto', tipo: 'misto', ativo: true },
              ].map((opcao) => (
                <button
                  key={opcao.nome}
                  type="button"
                  disabled={!opcao.ativo}
                  className={[
                    'ec-pagamento-opcao',
                    formaPagamento === opcao.nome ? 'selecionado' : '',
                    !opcao.ativo ? 'indisponivel' : '',
                  ].join(' ')}
                  onClick={() => {
                    if (!opcao.ativo) return

                    setFormaPagamento(opcao.nome)
                    setErroPagamento('')

                    if (opcao.nome !== 'Dinheiro') {
                      setValorRecebido('')
                    }
                  }}
                >
                  <span className={`ec-pagamento-icone ${opcao.tipo}`}>
                    {opcao.tipo === 'dinheiro' && '$'}
                    {opcao.tipo === 'pix' && '◇'}
                    {opcao.tipo === 'debito' && 'D'}
                    {opcao.tipo === 'credito' && 'C'}
                    {opcao.tipo === 'vale' && 'V'}
                    {opcao.tipo === 'presente' && 'P'}
                    {opcao.tipo === 'outras' && '+'}
                    {opcao.tipo === 'misto' && 'M'}
                  </span>

                  <span className="ec-pagamento-texto">
                    <strong>{opcao.nome}</strong>
                    {!opcao.ativo && <small>Em preparação</small>}
                    {opcao.tipo === 'misto' && opcao.ativo && (
                      <small>Mais de uma forma de pagamento</small>
                    )}
                  </span>

                  <span className="ec-pagamento-seta">›</span>
                </button>
              ))}
            </div>
            )}

            {formaPagamento === 'Dinheiro' && (
              <div className="ec-pagamento-dinheiro">
                <label className="ec-modal-campo">
                  <span>Valor recebido</span>

                  <div className="ec-campo-moeda">
                    <b>R$</b>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorRecebido}
                      onChange={(evento) => {
                        setValorRecebido(evento.target.value)
                        setErroPagamento('')
                      }}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                </label>

                <div className="ec-pagamento-troco">
                  <span>TROCO</span>
                  <strong>{formatarMoeda(troco)}</strong>
                </div>
              </div>
            )}

            {formaPagamento === 'Pagamento Misto' && (
              <div className="ec-pagamento-misto">
                <div className="ec-pagamento-misto-topo">
                  <div>
                    <strong>Dividir pagamento</strong>
                    <span>
                      Informe pelo menos duas formas
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormaPagamento('')
                      setPagamentosMistos({
                        Dinheiro: '',
                        Pix: '',
                        'Cartão de débito': '',
                        'Cartão de crédito': '',
                      })
                      setErroPagamento('')
                    }}
                  >
                    Alterar forma
                  </button>
                </div>

                <div className="ec-pagamento-misto-grid">
                  {[
                    ['Dinheiro', '$'],
                    ['Pix', '◇'],
                    ['Cartão de débito', 'D'],
                    ['Cartão de crédito', 'C'],
                  ].map(([forma, icone]) => (
                    <label
                      key={forma}
                      className="ec-pagamento-misto-campo"
                    >
                      <span>
                        <b>{icone}</b>
                        {forma}
                      </span>

                      <div>
                        <small>R$</small>

                        <input
                          type="text"
                          inputMode="decimal"
                          value={pagamentosMistos[forma]}
                          onChange={(evento) => {
                            setPagamentosMistos((atual) => ({
                              ...atual,
                              [forma]: evento.target.value,
                            }))
                            setErroPagamento('')
                          }}
                          placeholder="0,00"
                        />
                      </div>
                    </label>
                  ))}
                </div>

                <div className="ec-pagamento-misto-resumo">
                  <div>
                    <span>TOTAL INFORMADO</span>
                    <strong>
                      {formatarMoeda(
                        Object.values(pagamentosMistos)
                          .reduce(
                            (soma, valor) =>
                              soma + converterValor(valor),
                            0,
                          ),
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>RESTANTE</span>
                    <strong>
                      {formatarMoeda(
                        Math.max(
                          0,
                          totalVenda -
                            Object.values(pagamentosMistos)
                              .reduce(
                                (soma, valor) =>
                                  soma + converterValor(valor),
                                0,
                              ),
                        ),
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {formaPagamento &&
              formaPagamento !== 'Dinheiro' &&
              formaPagamento !== 'Pagamento Misto' && (
                <div className="ec-pagamento-selecionado">
                  Forma selecionada:
                  <strong> {formaPagamento}</strong>
                </div>
              )}

            {erroPagamento && (
              <div className="ec-modal-erro">{erroPagamento}</div>
            )}

            <div className="ec-pagamento-acoes">
              <button
                type="button"
                className="ec-botao-secundario"
                onClick={fecharPagamento}
                disabled={processandoVenda}
              >
                Voltar
              </button>

              <button
                type="button"
                className="ec-botao-principal"
                onClick={confirmarPagamento}
                disabled={processandoVenda || !formaPagamento}
              >
                {processandoVenda
                  ? 'Processando...'
                  : 'Confirmar pagamento'}
              </button>
            </div>

          </section>
        </div>
      )}

      {modalFechamento && (
        <div className="ec-modal-overlay">
          <section
            className="ec-modal-sangria"
            style={{ maxWidth: '560px' }}
          >
            <div className="ec-modal-cabecalho">
              <div>
                <span>FIM DE TURNO</span>
                <h2>Fechamento do Caixa {TERMINAL}</h2>
              </div>

              <button
                type="button"
                className="ec-modal-fechar"
                onClick={fecharModalFechamento}
              >
                ×
              </button>
            </div>

            <div className="ec-autorizacao-aviso">
              <div className="ec-autorizacao-cadeado">🔒</div>
              <div>
                <strong>Encerrar caixa</strong>
                <p>
                  Conte o dinheiro disponível na gaveta e informe
                  o valor abaixo para encerrar o turno.
                </p>
              </div>
            </div>

            <form onSubmit={confirmarFechamentoCaixa}>
              <label className="ec-modal-campo">
                <span>Operador</span>
                <input type="text" value={nomeOperador} disabled />
              </label>

              <label className="ec-modal-campo">
                <span>Valor contado na gaveta</span>

                <div className="ec-campo-moeda">
                  <b>R$</b>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={valorFechamento}
                    onChange={(evento) => {
                      setValorFechamento(evento.target.value)
                      setErroFechamento('')
                    }}
                    placeholder="0,00"
                    autoFocus
                  />
                </div>
              </label>

              {erroFechamento && (
                <div className="ec-modal-erro">
                  {erroFechamento}
                </div>
              )}

              <div className="ec-modal-acoes">
                <button
                  type="button"
                  className="ec-botao-secundario"
                  onClick={fecharModalFechamento}
                  disabled={fechandoCaixa}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="ec-botao-sangria"
                  disabled={fechandoCaixa}
                >
                  {fechandoCaixa
                    ? 'Fechando caixa...'
                    : 'Confirmar fechamento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {relatorioFechamento && (
        <div className="ec-modal-overlay">
          <section
            className="ec-modal-sangria"
            style={{
              width: 'min(760px, calc(100vw - 40px))',
              maxWidth: '760px',
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
            }}
          >
            <div className="ec-modal-cabecalho">
              <div>
                <span>RELATÓRIO DE FECHAMENTO</span>
                <h2>Caixa {relatorioFechamento.terminal}</h2>
              </div>

              <button
                type="button"
                className="ec-modal-fechar"
                onClick={() => setRelatorioFechamento(null)}
              >
                ×
              </button>
            </div>

            <div
              style={{
                padding: '14px 16px',
                marginBottom: '18px',
                borderRadius: '9px',
                background: '#eaf8ef',
                border: '1px solid #9bd7ae',
                color: '#176b37',
                fontWeight: '800',
                textAlign: 'center',
              }}
            >
              ✓ CAIXA FECHADO COM SUCESSO
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              <div style={{ padding: '12px', background: '#f6f8fb', borderRadius: '8px' }}>
                <small>OPERADOR</small>
                <div><strong>{relatorioFechamento.operador}</strong></div>
              </div>

              <div style={{ padding: '12px', background: '#f6f8fb', borderRadius: '8px' }}>
                <small>TERMINAL</small>
                <div><strong>Caixa {relatorioFechamento.terminal}</strong></div>
              </div>

              <div style={{ padding: '12px', background: '#f6f8fb', borderRadius: '8px' }}>
                <small>ABERTURA</small>
                <div>
                  <strong>
                    {relatorioFechamento.abertoEm
                      ? new Date(relatorioFechamento.abertoEm).toLocaleString('pt-BR')
                      : '—'}
                  </strong>
                </div>
              </div>

              <div style={{ padding: '12px', background: '#f6f8fb', borderRadius: '8px' }}>
                <small>FECHAMENTO</small>
                <div>
                  <strong>
                    {new Date(relatorioFechamento.fechadoEm).toLocaleString('pt-BR')}
                  </strong>
                </div>
              </div>
            </div>

            <div
              style={{
                border: '1px solid #dbe3ec',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '18px',
              }}
            >
              {[
                ['Fundo inicial', relatorioFechamento.valorInicial],
                ['Vendas em dinheiro', relatorioFechamento.totalVendas],
                ['Sangrias', -Math.abs(relatorioFechamento.totalSangrias)],
                ['Saldo teórico', relatorioFechamento.saldoTeorico],
                ['Valor contado', relatorioFechamento.valorContado],
              ].map(([rotulo, valor]) => (
                <div
                  key={rotulo}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '12px 15px',
                    borderBottom: '1px solid #e7edf3',
                  }}
                >
                  <span>{rotulo}</span>
                  <strong>{formatarMoeda(valor)}</strong>
                </div>
              ))}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '16px 15px',
                  background:
                    relatorioFechamento.diferenca === 0
                      ? '#eaf8ef'
                      : '#fff4e5',
                  fontSize: '18px',
                }}
              >
                <strong>DIFERENÇA</strong>
                <strong>
                  {formatarMoeda(relatorioFechamento.diferenca)}
                </strong>
              </div>
            </div>

            <div
              className="ec-modal-acoes"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                position: 'sticky',
                bottom: 0,
                background: '#ffffff',
                paddingTop: '10px',
              }}
            >
              <button
                type="button"
                className="ec-botao-secundario"
                style={{
                  minHeight: '44px',
                  width: '100%',
                  fontWeight: '800',
                  fontSize: '14px',
                }}
                onClick={() => window.print()}
              >
                🖨 Imprimir
              </button>

              <button
                type="button"
                className="ec-botao-principal"
                style={{
                  minHeight: '44px',
                  width: '100%',
                  fontWeight: '800',
                  fontSize: '14px',
                }}
                onClick={() => setRelatorioFechamento(null)}
              >
                Concluir
              </button>
            </div>
          </section>
        </div>
      )}

      {modalSangria && (
        <div className="ec-modal-overlay">
          <section className="ec-modal-sangria">
            <div className="ec-modal-cabecalho">
              <div>
                <span>CONTROLE DE CAIXA</span>
                <h2>Sangria</h2>
              </div>

              <button
                type="button"
                className="ec-modal-fechar"
                onClick={fecharSangria}
              >
                ×
              </button>
            </div>

            {!gestorAutorizado ? (
              <form onSubmit={autorizarGestor}>
                <div className="ec-autorizacao-aviso">
                  <div className="ec-autorizacao-cadeado">
                    🔐
                  </div>

                  <div>
                    <strong>
                      Autorização do gestor obrigatória
                    </strong>

                    <p>
                      Somente gerente, gestor ou administrador
                      pode liberar retirada de dinheiro do caixa.
                    </p>
                  </div>
                </div>

                <label className="ec-modal-campo">
                  <span>E-mail do gestor</span>

                  <input
                    type="email"
                    value={emailGestor}
                    onChange={(evento) =>
                      setEmailGestor(evento.target.value)
                    }
                    placeholder="gestor@empresa.com"
                    autoFocus
                  />
                </label>

                <label className="ec-modal-campo">
                  <span>Senha do gestor</span>

                  <input
                    type="password"
                    value={senhaGestor}
                    onChange={(evento) =>
                      setSenhaGestor(evento.target.value)
                    }
                    placeholder="Digite a senha"
                  />
                </label>

                {erroGestor && (
                  <div className="ec-modal-erro">
                    {erroGestor}
                  </div>
                )}

                <div className="ec-modal-acoes">
                  <button
                    type="button"
                    className="ec-botao-secundario"
                    onClick={fecharSangria}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="ec-botao-principal"
                    disabled={validandoGestor}
                  >
                    {validandoGestor
                      ? 'Validando...'
                      : 'Autorizar operação'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={confirmarSangria}>
                <div className="ec-autorizado">
                  ✓ Gestor autorizado
                </div>

                <label className="ec-modal-campo">
                  <span>Valor da sangria</span>

                  <div className="ec-campo-moeda">
                    <b>R$</b>

                    <input
                      type="text"
                      inputMode="decimal"
                      value={valorSangria}
                      onChange={(evento) =>
                        setValorSangria(evento.target.value)
                      }
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                </label>

                <label className="ec-modal-campo">
                  <span>Motivo</span>

                  <select
                    value={motivoSangria}
                    onChange={(evento) =>
                      setMotivoSangria(evento.target.value)
                    }
                  >
                    <option>Retirada de numerário</option>
                    <option>Excesso de dinheiro no caixa</option>
                    <option>Transferência para tesouraria</option>
                    <option>Outro</option>
                  </select>
                </label>

                {erroGestor && (
                  <div className="ec-modal-erro">
                    {erroGestor}
                  </div>
                )}

                <div className="ec-modal-acoes">
                  <button
                    type="button"
                    className="ec-botao-secundario"
                    onClick={fecharSangria}
                    disabled={processandoSangria}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="ec-botao-sangria"
                    disabled={processandoSangria}
                  >
                    {processandoSangria
                      ? 'Registrando...'
                      : 'Confirmar sangria'}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default Pdv
