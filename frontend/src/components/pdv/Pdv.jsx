import { useEffect, useMemo, useRef, useState } from 'react'
import './Pdv.css'

const API_URL = 'http://localhost:3000'
const TERMINAL = '001'

function Pdv({ usuario, token, onSair }) {
  const campoCodigoRef = useRef(null)

  const [codigo, setCodigo] = useState('')
  const [itens, setItens] = useState([])
  const [produtos, setProdutos] = useState([])
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

    const preco = Number(produto.preco || 0)

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

    let listaProdutos = produtos

    if (listaProdutos.length === 0) {
      try {
        const resposta = await fetch(`${API_URL}/api/produtos`, {
          headers: {
            Authorization: `Bearer ${tokenAcesso}`,
          },
        })

        const dados = await resposta.json()

        if (!resposta.ok) {
          throw new Error(
            dados.erro || 'Erro ao consultar produtos.',
          )
        }

        listaProdutos = Array.isArray(dados.produtos)
          ? dados.produtos
          : []

        setProdutos(listaProdutos)
      } catch (erro) {
        alert(erro.message)
        focarCodigo()
        return
      }
    }

    const produto = listaProdutos.find(
      (item) =>
        String(item.codigoBarras || '').trim() === codigoLimpo,
    )

    if (!produto) {
      alert(
        `Produto não encontrado.\n\nCódigo: ${codigoLimpo}`,
      )

      setCodigo('')
      focarCodigo()
      return
    }

    adicionarProduto(produto)
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
          clienteId: null,
          formaPagamento,
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

      await Promise.all([
        carregarProdutos(),
        carregarCaixaAtual(),
      ])

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

      alert(
        `CAIXA ${TERMINAL} FECHADO COM SUCESSO!\n\n` +
          `Saldo teórico: ${formatarMoeda(caixaFechado.saldoTeorico)}\n` +
          `Valor contado: ${formatarMoeda(caixaFechado.valorInformadoFechamento ?? valorInformado)}\n` +
          `Diferença: ${formatarMoeda(caixaFechado.diferenca)}`,
      )

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
          <section
            className="ec-modal-sangria"
            style={{ maxWidth: '620px' }}
          >
            <div className="ec-modal-cabecalho">
              <div>
                <span>FINALIZAÇÃO DA VENDA</span>
                <h2>Pagamento</h2>
              </div>

              <button
                type="button"
                className="ec-modal-fechar"
                onClick={fecharPagamento}
              >
                ×
              </button>
            </div>

            <div
              style={{
                marginBottom: '20px',
                padding: '18px',
                background: '#0b2238',
                borderRadius: '10px',
                textAlign: 'center',
                color: '#fff',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  opacity: 0.8,
                  marginBottom: '5px',
                }}
              >
                TOTAL DA VENDA
              </div>

              <strong style={{ fontSize: '38px' }}>
                {formatarMoeda(totalVenda)}
              </strong>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              {[
                'Dinheiro',
                'Pix',
                'Cartão de débito',
                'Cartão de crédito',
              ].map((forma) => (
                <button
                  key={forma}
                  type="button"
                  onClick={() => {
                    setFormaPagamento(forma)
                    setErroPagamento('')

                    if (forma !== 'Dinheiro') {
                      setValorRecebido('')
                    }
                  }}
                  style={{
                    padding: '18px 10px',
                    borderRadius: '9px',
                    border:
                      formaPagamento === forma
                        ? '3px solid #1d8cff'
                        : '1px solid #cbd5e1',
                    background:
                      formaPagamento === forma
                        ? '#eaf4ff'
                        : '#fff',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '15px',
                  }}
                >
                  {forma === 'Dinheiro' && '💵 '}
                  {forma === 'Pix' && '◆ '}
                  {forma === 'Cartão de débito' && '💳 '}
                  {forma === 'Cartão de crédito' && '💳 '}
                  {forma}
                </button>
              ))}
            </div>

            {formaPagamento === 'Dinheiro' && (
              <div style={{ marginBottom: '18px' }}>
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

                <div
                  style={{
                    marginTop: '12px',
                    padding: '13px',
                    borderRadius: '8px',
                    background: '#eef7ee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '17px',
                  }}
                >
                  <span>TROCO</span>
                  <strong>{formatarMoeda(troco)}</strong>
                </div>
              </div>
            )}

            {formaPagamento &&
              formaPagamento !== 'Dinheiro' && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    marginBottom: '18px',
                    background: '#eef5ff',
                    textAlign: 'center',
                  }}
                >
                  Forma selecionada:
                  <strong> {formaPagamento}</strong>
                </div>
              )}

            {erroPagamento && (
              <div className="ec-modal-erro">
                {erroPagamento}
              </div>
            )}

            <div className="ec-modal-acoes">
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
                disabled={
                  processandoVenda || !formaPagamento
                }
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
