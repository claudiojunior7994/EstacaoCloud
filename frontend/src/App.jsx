import { useEffect, useState } from 'react'
import Login from './components/Login'
import Pdv from './components/pdv/Pdv'
import './App.css'

function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    try {
      const usuarioSalvo = localStorage.getItem('estacaocloud-usuario')
      return usuarioSalvo ? JSON.parse(usuarioSalvo) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(
    () => localStorage.getItem('estacaocloud-token') || '',
  )

  const [ambiente, setAmbiente] = useState(
    () => localStorage.getItem('estacaocloud-ambiente') || '',
  )

  const [verificandoSessao, setVerificandoSessao] = useState(true)

  useEffect(() => {
    async function validarSessao() {
      if (!token) {
        setVerificandoSessao(false)
        return
      }

      try {
        const resposta = await fetch('http://localhost:3000/api/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!resposta.ok) {
          localStorage.removeItem('estacaocloud-token')
          localStorage.removeItem('estacaocloud-usuario')
          setToken('')
          setUsuarioLogado(null)
        }
      } catch (erro) {
        console.error('Erro ao validar sessão:', erro)
      } finally {
        setVerificandoSessao(false)
      }
    }

    validarSessao()
  }, [token])

  function concluirLogin(usuario, novoToken, ambienteAcesso = 'gestao') {
    localStorage.setItem('estacaocloud-ambiente', ambienteAcesso)
    setUsuarioLogado(usuario)
    setToken(novoToken)
    setAmbiente(ambienteAcesso)
    setPagina(ambienteAcesso === 'estoque' ? 'produtos' : 'visao-geral')
    setVerificandoSessao(false)
  }

  function sairDoSistema() {
    localStorage.removeItem('estacaocloud-token')
    localStorage.removeItem('estacaocloud-usuario')
    localStorage.removeItem('estacaocloud-ambiente')
    setUsuarioLogado(null)
    setToken('')
    setAmbiente('')
    setPagina('visao-geral')
  }

  const [pagina, setPagina] = useState('visao-geral')

  const [vendas, setVendas] = useState([])
  const [produtoPdvId, setProdutoPdvId] = useState('')
  const [quantidadePdv, setQuantidadePdv] = useState(1)
  const [itensVenda, setItensVenda] = useState([])
  const [clienteVendaId, setClienteVendaId] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [descontoVenda, setDescontoVenda] = useState('0')

  const [mostrarFormularioProduto, setMostrarFormularioProduto] =
    useState(false)

  const [produtos, setProdutos] = useState([])
  const [buscaProduto, setBuscaProduto] = useState('')
  const [produtoEmEdicao, setProdutoEmEdicao] = useState(null)

  const produtoVazio = {
    codigoBarras: '',
    nome: '',
    categoria: '',
    precoCusto: '',
    precoVenda: '',
    estoque: '',
    estoqueMinimo: '',
  }

  const [novoProduto, setNovoProduto] = useState(produtoVazio)

  useEffect(() => {
    async function carregarProdutos() {
      if (!token) {
        setProdutos([])
        return
      }

      try {
        const resposta = await fetch(
          'http://localhost:3000/api/produtos',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
          console.error('Erro ao carregar produtos:', dados.erro)
          return
        }

        setProdutos(
          (dados.produtos || []).map((produto) => ({
            ...produto,
            precoCusto: Number(produto.custo || 0),
            precoVenda: Number(produto.preco || 0),
            estoque: Number(produto.estoque || 0),
            estoqueMinimo: Number(produto.estoqueMinimo || 0),
          })),
        )
      } catch (erro) {
        console.error('Erro ao carregar produtos:', erro)
      }
    }

    carregarProdutos()
  }, [token])

  const fornecedorVazio = {
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
  }

  const [fornecedores, setFornecedores] = useState(() => {
    try {
      const fornecedoresSalvos = localStorage.getItem('estacaocloud-fornecedores')
      return fornecedoresSalvos ? JSON.parse(fornecedoresSalvos) : []
    } catch {
      return []
    }
  })
  const [buscaFornecedor, setBuscaFornecedor] = useState('')
  const [fornecedorEmEdicao, setFornecedorEmEdicao] = useState(null)
  const [mostrarFormularioFornecedor, setMostrarFormularioFornecedor] =
    useState(false)
  const [novoFornecedor, setNovoFornecedor] = useState(fornecedorVazio)

  useEffect(() => {
    try {
      localStorage.setItem(
        'estacaocloud-fornecedores',
        JSON.stringify(fornecedores),
      )
    } catch (erro) {
      console.error('Erro ao salvar fornecedores:', erro)
    }
  }, [fornecedores])


  const clienteVazio = {
    nome: '',
    cpfCnpj: '',
    telefone: '',
    email: '',
    nascimento: '',
    clube: true,
    ativo: true,
  }

  const [clientes, setClientes] = useState(() => {
    try {
      const clientesSalvos = localStorage.getItem('estacaocloud-clientes')
      return clientesSalvos ? JSON.parse(clientesSalvos) : []
    } catch {
      return []
    }
  })
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteEmEdicao, setClienteEmEdicao] = useState(null)
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState(clienteVazio)

  useEffect(() => {
    try {
      localStorage.setItem('estacaocloud-clientes', JSON.stringify(clientes))
    } catch (erro) {
      console.error('Erro ao salvar clientes:', erro)
    }
  }, [clientes])

  useEffect(() => {
    async function carregarVendas() {
      if (!token) {
        setVendas([])
        return
      }

      try {
        const resposta = await fetch('http://localhost:3000/api/vendas', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const dados = await resposta.json()

        if (!resposta.ok) {
          console.error('Erro ao carregar vendas:', dados.erro)
          return
        }

        setVendas(dados.vendas || [])
      } catch (erro) {
        console.error('Erro ao carregar vendas:', erro)
      }
    }

    carregarVendas()
  }, [token])

  function iniciarVenda() {
    localStorage.setItem('estacaocloud-ambiente', 'pdv')
    setAmbiente('pdv')
  }

  function adicionarItemVenda() {
    const produto = produtos.find(
      (item) => String(item.id) === String(produtoPdvId),
    )
    const quantidade = Number(quantidadePdv)

    if (!produto) {
      alert('Selecione um produto.')
      return
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      alert('Informe uma quantidade válida.')
      return
    }

    if (quantidade > Number(produto.estoque || 0)) {
      alert('Quantidade maior que o estoque disponível.')
      return
    }

    setItensVenda((listaAtual) => {
      const existente = listaAtual.find(
        (item) => item.produtoId === produto.id,
      )

      if (existente) {
        const novaQuantidade = existente.quantidade + quantidade

        if (novaQuantidade > Number(produto.estoque || 0)) {
          alert('Quantidade total maior que o estoque disponível.')
          return listaAtual
        }

        return listaAtual.map((item) =>
          item.produtoId === produto.id
            ? { ...item, quantidade: novaQuantidade }
            : item,
        )
      }

      return [
        ...listaAtual,
        {
          produtoId: produto.id,
          nome: produto.nome,
          quantidade,
          precoUnitario: Number(produto.precoVenda || 0),
        },
      ]
    })

    setProdutoPdvId('')
    setQuantidadePdv(1)
  }

  function removerItemVenda(produtoId) {
    setItensVenda((listaAtual) =>
      listaAtual.filter((item) => item.produtoId !== produtoId),
    )
  }

  const subtotalVenda = itensVenda.reduce(
    (total, item) =>
      total + Number(item.quantidade) * Number(item.precoUnitario),
    0,
  )

  const descontoVendaNumero = Number(descontoVenda || 0)
  const totalVenda = Math.max(0, subtotalVenda - descontoVendaNumero)

  async function finalizarVenda() {
    if (itensVenda.length === 0) {
      alert('Adicione pelo menos um produto à venda.')
      return
    }

    if (
      !Number.isFinite(descontoVendaNumero) ||
      descontoVendaNumero < 0 ||
      descontoVendaNumero > subtotalVenda
    ) {
      alert('Informe um desconto válido.')
      return
    }

    try {
      const resposta = await fetch('http://localhost:3000/api/vendas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itens: itensVenda,
          clienteId: clienteVendaId || null,
          formaPagamento,
          desconto: descontoVendaNumero,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível finalizar a venda.')
        return
      }

      setVendas((listaAtual) => [dados.venda, ...listaAtual])

      const respostaProdutos = await fetch(
        'http://localhost:3000/api/produtos',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dadosProdutos = await respostaProdutos.json()

      if (respostaProdutos.ok) {
        setProdutos(
          (dadosProdutos.produtos || []).map((produto) => ({
            ...produto,
            precoCusto: Number(produto.custo || 0),
            precoVenda: Number(produto.preco || 0),
            estoque: Number(produto.estoque || 0),
            estoqueMinimo: Number(produto.estoqueMinimo || 0),
          })),
        )
      }

      setMostrarPdv(false)
      setItensVenda([])
      alert(`Venda #${dados.venda.id} concluída com sucesso.`)
    } catch (erro) {
      console.error('Erro ao finalizar venda:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  const paginas = {
    'visao-geral': {
      titulo: 'Visão geral',
      icone: '🏠',
    },

    produtos: {
      titulo: 'Produtos',
      icone: '📦',
    },

    vendas: {
      titulo: 'Vendas',
      icone: '🛒',
    },

    clientes: {
      titulo: 'Clientes',
      icone: '👥',
    },

    fornecedores: {
      titulo: 'Fornecedores',
      icone: '🚚',
    },

    relatorios: {
      titulo: 'Relatórios',
      icone: '📊',
    },

    configuracoes: {
      titulo: 'Configurações',
      icone: '⚙️',
    },
  }

  function abrirPagina(nomePagina) {
    if (
      ambiente === 'estoque' &&
      !['produtos', 'fornecedores'].includes(nomePagina)
    ) {
      return
    }

    setPagina(nomePagina)
    setMostrarFormularioProduto(false)
    setMostrarFormularioFornecedor(false)
    setMostrarFormularioCliente(false)
  }

  function abrirCadastroProduto() {
    setPagina('produtos')
    setProdutoEmEdicao(null)
    setNovoProduto(produtoVazio)
    setMostrarFormularioProduto(true)
  }

  function fecharCadastroProduto() {
    setMostrarFormularioProduto(false)
    setProdutoEmEdicao(null)
    setNovoProduto(produtoVazio)
  }

  function alterarCampoProduto(evento) {
    const { name, value } = evento.target

    setNovoProduto((produtoAtual) => ({
      ...produtoAtual,
      [name]: value,
    }))
  }

  async function salvarProduto(evento) {
    evento.preventDefault()

    if (
      !novoProduto.nome.trim() ||
      !novoProduto.precoVenda ||
      novoProduto.estoque === ''
    ) {
      alert('Preencha pelo menos nome, preço de venda e estoque.')
      return
    }

    const payload = {
      codigoBarras: novoProduto.codigoBarras.trim(),
      nome: novoProduto.nome.trim(),
      categoria: novoProduto.categoria.trim(),
      custo: Number(novoProduto.precoCusto || 0),
      preco: Number(novoProduto.precoVenda || 0),
      estoque: Number(novoProduto.estoque || 0),
      estoqueMinimo: Number(novoProduto.estoqueMinimo || 0),
    }

    try {
      const url = produtoEmEdicao
        ? `http://localhost:3000/api/produtos/${produtoEmEdicao.id}`
        : 'http://localhost:3000/api/produtos'

      const resposta = await fetch(url, {
        method: produtoEmEdicao ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível salvar o produto.')
        return
      }

      const produtoApi = {
        ...dados.produto,
        precoCusto: Number(dados.produto.custo || 0),
        precoVenda: Number(dados.produto.preco || 0),
        estoque: Number(dados.produto.estoque || 0),
        estoqueMinimo: Number(dados.produto.estoqueMinimo || 0),
      }

      if (produtoEmEdicao) {
        setProdutos((listaAtual) =>
          listaAtual.map((produto) =>
            produto.id === produtoApi.id
              ? produtoApi
              : produto,
          ),
        )
      } else {
        setProdutos((listaAtual) => [
          ...listaAtual,
          produtoApi,
        ])
      }

      fecharCadastroProduto()
    } catch (erro) {
      console.error('Erro ao salvar produto:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  function editarProduto(produto) {
    setProdutoEmEdicao(produto)
    setNovoProduto({
      codigoBarras: produto.codigoBarras || '',
      nome: produto.nome || '',
      categoria: produto.categoria || '',
      precoCusto: String(produto.precoCusto ?? produto.custo ?? ''),
      precoVenda: String(produto.precoVenda ?? produto.preco ?? ''),
      estoque: String(produto.estoque ?? ''),
      estoqueMinimo: String(produto.estoqueMinimo ?? ''),
    })
    setMostrarFormularioProduto(true)
  }

  async function excluirProduto(produto) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o produto "${produto.nome}"?`,
    )

    if (!confirmou) return

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/produtos/${produto.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível excluir o produto.')
        return
      }

      setProdutos((listaAtual) =>
        listaAtual.filter((item) => item.id !== produto.id),
      )

      if (produtoEmEdicao?.id === produto.id) {
        fecharCadastroProduto()
      }
    } catch (erro) {
      console.error('Erro ao excluir produto:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  function abrirCadastroFornecedor() {
    setPagina('fornecedores')
    setFornecedorEmEdicao(null)
    setNovoFornecedor(fornecedorVazio)
    setMostrarFormularioFornecedor(true)
  }

  function fecharCadastroFornecedor() {
    setMostrarFormularioFornecedor(false)
    setFornecedorEmEdicao(null)
    setNovoFornecedor(fornecedorVazio)
  }

  function alterarCampoFornecedor(evento) {
    const { name, value } = evento.target
    setNovoFornecedor((fornecedorAtual) => ({
      ...fornecedorAtual,
      [name]: value,
    }))
  }

  function salvarFornecedor(evento) {
    evento.preventDefault()

    if (!novoFornecedor.nome.trim()) {
      alert('Preencha pelo menos o nome do fornecedor.')
      return
    }

    const dadosFornecedor = {
      nome: novoFornecedor.nome.trim(),
      cnpj: novoFornecedor.cnpj.trim(),
      telefone: novoFornecedor.telefone.trim(),
      email: novoFornecedor.email.trim(),
    }

    if (fornecedorEmEdicao) {
      setFornecedores((listaAtual) =>
        listaAtual.map((fornecedor) =>
          fornecedor.id === fornecedorEmEdicao.id
            ? { ...fornecedor, ...dadosFornecedor }
            : fornecedor,
        ),
      )
    } else {
      setFornecedores((listaAtual) => [
        ...listaAtual,
        { id: Date.now(), ...dadosFornecedor },
      ])
    }

    fecharCadastroFornecedor()
  }

  function editarFornecedor(fornecedor) {
    setFornecedorEmEdicao(fornecedor)
    setNovoFornecedor({
      nome: fornecedor.nome || '',
      cnpj: fornecedor.cnpj || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
    })
    setMostrarFormularioFornecedor(true)
  }

  function excluirFornecedor(fornecedor) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o fornecedor "${fornecedor.nome}"?`,
    )

    if (!confirmou) return

    setFornecedores((listaAtual) =>
      listaAtual.filter((item) => item.id !== fornecedor.id),
    )

    if (fornecedorEmEdicao?.id === fornecedor.id) {
      fecharCadastroFornecedor()
    }
  }

  function abrirCadastroCliente() {
    setPagina('clientes')
    setClienteEmEdicao(null)
    setNovoCliente(clienteVazio)
    setMostrarFormularioCliente(true)
  }

  function fecharCadastroCliente() {
    setMostrarFormularioCliente(false)
    setClienteEmEdicao(null)
    setNovoCliente(clienteVazio)
  }

  function alterarCampoCliente(evento) {
    const { name, value, type, checked } = evento.target

    setNovoCliente((clienteAtual) => ({
      ...clienteAtual,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function salvarCliente(evento) {
    evento.preventDefault()

    if (!novoCliente.nome.trim()) {
      alert('Preencha pelo menos o nome do cliente.')
      return
    }

    const dadosCliente = {
      nome: novoCliente.nome.trim(),
      cpfCnpj: novoCliente.cpfCnpj.trim(),
      telefone: novoCliente.telefone.trim(),
      email: novoCliente.email.trim(),
      nascimento: novoCliente.nascimento,
      clube: Boolean(novoCliente.clube),
      ativo: Boolean(novoCliente.ativo),
    }

    if (clienteEmEdicao) {
      setClientes((listaAtual) =>
        listaAtual.map((cliente) =>
          cliente.id === clienteEmEdicao.id
            ? { ...cliente, ...dadosCliente }
            : cliente,
        ),
      )
    } else {
      setClientes((listaAtual) => [
        ...listaAtual,
        {
          id: Date.now(),
          criadoEm: new Date().toISOString(),
          ...dadosCliente,
        },
      ])
    }

    fecharCadastroCliente()
  }

  function editarCliente(cliente) {
    setClienteEmEdicao(cliente)
    setNovoCliente({
      nome: cliente.nome || '',
      cpfCnpj: cliente.cpfCnpj || '',
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      nascimento: cliente.nascimento || '',
      clube: Boolean(cliente.clube),
      ativo: cliente.ativo !== false,
    })
    setMostrarFormularioCliente(true)
  }

  function excluirCliente(cliente) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o cliente "${cliente.nome}"?`,
    )

    if (!confirmou) return

    setClientes((listaAtual) =>
      listaAtual.filter((item) => item.id !== cliente.id),
    )

    if (clienteEmEdicao?.id === cliente.id) {
      fecharCadastroCliente()
    }
  }

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  function chaveDataLocal(valor = new Date()) {
    const data = valor instanceof Date ? valor : new Date(valor)

    if (Number.isNaN(data.getTime())) {
      return ''
    }

    const ano = data.getFullYear()
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')

    return `${ano}-${mes}-${dia}`
  }

  const chaveHoje = chaveDataLocal()

  const vendasHojeGerais = vendas.filter(
    (venda) =>
      chaveDataLocal(venda.criadaEm) === chaveHoje &&
      venda.status !== 'cancelada',
  )

  const faturamentoHojeGeral = vendasHojeGerais.reduce(
    (total, venda) => total + Number(venda.total || 0),
    0,
  )

  const totalProdutos = produtos.length

  const produtosEstoqueBaixo = produtos.filter(
    (produto) =>
      produto.estoque > 0 && produto.estoque <= produto.estoqueMinimo,
  ).length

  const produtosSemEstoque = produtos.filter(
    (produto) => produto.estoque <= 0,
  ).length

  const valorEstoque = produtos.reduce(
    (total, produto) => total + produto.precoCusto * produto.estoque,
    0,
  )

  const termoBuscaProduto = buscaProduto.trim().toLowerCase()

  const produtosFiltrados = produtos.filter((produto) => {
    if (!termoBuscaProduto) return true

    return (
      produto.nome.toLowerCase().includes(termoBuscaProduto) ||
      produto.codigoBarras.toLowerCase().includes(termoBuscaProduto) ||
      produto.categoria.toLowerCase().includes(termoBuscaProduto)
    )
  })

  const termoBuscaFornecedor = buscaFornecedor.trim().toLowerCase()

  const fornecedoresFiltrados = fornecedores.filter((fornecedor) => {
    if (!termoBuscaFornecedor) return true

    return (
      fornecedor.nome.toLowerCase().includes(termoBuscaFornecedor) ||
      fornecedor.cnpj.toLowerCase().includes(termoBuscaFornecedor) ||
      fornecedor.telefone.toLowerCase().includes(termoBuscaFornecedor) ||
      fornecedor.email.toLowerCase().includes(termoBuscaFornecedor)
    )
  })

  const termoBuscaCliente = buscaCliente.trim().toLowerCase()

  const clientesFiltrados = clientes.filter((cliente) => {
    if (!termoBuscaCliente) return true

    return (
      cliente.nome.toLowerCase().includes(termoBuscaCliente) ||
      cliente.cpfCnpj.toLowerCase().includes(termoBuscaCliente) ||
      cliente.telefone.toLowerCase().includes(termoBuscaCliente) ||
      cliente.email.toLowerCase().includes(termoBuscaCliente)
    )
  })

  const clientesClube = clientes.filter((cliente) => cliente.clube).length
  const clientesAtivos = clientes.filter(
    (cliente) => cliente.ativo !== false,
  ).length

  function renderFormularioProduto() {
    const editando = Boolean(produtoEmEdicao)

    return (
      <article className="panel product-form-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">
              {editando ? 'EDIÇÃO DE CADASTRO' : 'NOVO CADASTRO'}
            </p>
            <h3>{editando ? 'Editar produto' : 'Cadastrar produto'}</h3>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={fecharCadastroProduto}
          >
            Fechar
          </button>
        </div>

        <form className="product-form" onSubmit={salvarProduto}>
          <div className="form-group">
            <label htmlFor="codigoBarras">Código de barras</label>
            <input
              id="codigoBarras"
              name="codigoBarras"
              type="text"
              placeholder="Ex.: 7891234567890"
              value={novoProduto.codigoBarras}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group form-group-large">
            <label htmlFor="nome">Nome do produto *</label>
            <input
              id="nome"
              name="nome"
              type="text"
              placeholder="Ex.: Arroz Tipo 1 5kg"
              value={novoProduto.nome}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoria</label>
            <input
              id="categoria"
              name="categoria"
              type="text"
              placeholder="Ex.: Mercearia"
              value={novoProduto.categoria}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group">
            <label htmlFor="precoCusto">Preço de custo</label>
            <input
              id="precoCusto"
              name="precoCusto"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={novoProduto.precoCusto}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group">
            <label htmlFor="precoVenda">Preço de venda *</label>
            <input
              id="precoVenda"
              name="precoVenda"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={novoProduto.precoVenda}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group">
            <label htmlFor="estoque">Estoque atual *</label>
            <input
              id="estoque"
              name="estoque"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={novoProduto.estoque}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group">
            <label htmlFor="estoqueMinimo">Estoque mínimo</label>
            <input
              id="estoqueMinimo"
              name="estoqueMinimo"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={novoProduto.estoqueMinimo}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={fecharCadastroProduto}
            >
              Cancelar
            </button>

            <button type="submit" className="primary-button">
              {editando ? 'Salvar alterações' : 'Salvar produto'}
            </button>
          </div>
        </form>
      </article>
    )
  }

  function renderListaProdutos() {
    if (produtos.length === 0) {
      return (
        <div className="empty-chart">
          <p>Nenhum produto cadastrado ainda.</p>
        </div>
      )
    }

    if (produtosFiltrados.length === 0) {
      return (
        <div className="empty-chart">
          <p>Nenhum produto encontrado para esta busca.</p>
        </div>
      )
    }

    return (
      <div className="products-table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Código</th>
              <th>Categoria</th>
              <th>Venda</th>
              <th>Estoque</th>
              <th>Status</th>
              <th className="actions-column">Ações</th>
            </tr>
          </thead>

          <tbody>
            {produtosFiltrados.map((produto) => {
              const semEstoque = produto.estoque <= 0
              const estoqueBaixo =
                produto.estoque > 0 &&
                produto.estoque <= produto.estoqueMinimo

              let status = 'Normal'
              let statusClasse = 'status-normal'

              if (semEstoque) {
                status = 'Sem estoque'
                statusClasse = 'status-danger'
              } else if (estoqueBaixo) {
                status = 'Estoque baixo'
                statusClasse = 'status-warning'
              }

              return (
                <tr key={produto.id}>
                  <td><strong>{produto.nome}</strong></td>
                  <td>{produto.codigoBarras || '-'}</td>
                  <td>{produto.categoria || '-'}</td>
                  <td>{formatarMoeda(produto.precoVenda)}</td>
                  <td>{produto.estoque}</td>
                  <td>
                    <span className={`product-status ${statusClasse}`}>
                      {status}
                    </span>
                  </td>
                  <td className="product-actions">
                    <button
                      type="button"
                      className="table-action-button"
                      onClick={() => editarProduto(produto)}
                      title="Editar produto"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      type="button"
                      className="table-action-button danger"
                      onClick={() => excluirProduto(produto)}
                      title="Excluir produto"
                    >
                      🗑️ Excluir
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderVisaoGeral() {
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              BEM-VINDO AO ESTAÇÃOCLOUD
            </p>

            <h3>
              Controle sua operação em um só lugar.
            </h3>

            <p className="welcome-text">
              Estoque, vendas, clientes, fornecedores e
              desempenho do seu negócio de forma simples,
              rápida e organizada.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => abrirPagina('vendas')}
          >
            + Nova venda
          </button>
        </section>

        <section className="cards">
          <article className="card">
            <div className="card-top">
              <span>Vendas hoje</span>
              <span className="card-icon">💰</span>
            </div>

            <strong>{formatarMoeda(faturamentoHojeGeral)}</strong>

            <small>
              {vendasHojeGerais.length === 0
                ? 'Nenhuma venda registrada hoje'
                : `${vendasHojeGerais.length} venda(s) realizada(s) hoje`}
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Produtos cadastrados</span>
              <span className="card-icon">📦</span>
            </div>

            <strong>
              {totalProdutos}
            </strong>

            <small>
              Itens cadastrados no sistema
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Estoque baixo</span>
              <span className="card-icon">⚠️</span>
            </div>

            <strong>
              {produtosEstoqueBaixo}
            </strong>

            <small>
              Produtos próximos da reposição
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Clientes</span>
              <span className="card-icon">👥</span>
            </div>

            <strong>{clientes.length}</strong>

            <small>
              {clientes.length === 0
                ? 'Nenhum cliente cadastrado'
                : 'Clientes cadastrados no sistema'}
            </small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  MOVIMENTO
                </p>

                <h3>
                  Resumo de vendas
                </h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => abrirPagina('relatorios')}
              >
                Ver relatório
              </button>
            </div>

            <div className="empty-chart">
              <div className="chart-bars">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>

              <p>
                As vendas aparecerão aqui
              </p>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  ATALHOS
                </p>

                <h3>
                  Acesso rápido
                </h3>
              </div>
            </div>

            <div className="quick-actions">
              <button
                type="button"
                onClick={abrirCadastroProduto}
              >
                📦 Cadastrar produto
              </button>

              <button
                type="button"
                onClick={() => abrirPagina('vendas')}
              >
                🛒 Registrar venda
              </button>

              <button
                type="button"
                onClick={abrirCadastroCliente}
              >
                👤 Cadastrar cliente
              </button>

              <button
                type="button"
                onClick={abrirCadastroFornecedor}
              >
                🚚 Novo fornecedor
              </button>
            </div>
          </article>
        </section>
      </>
    )
  }

  function renderProdutos() {
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              ESTOQUE E CADASTRO
            </p>

            <h3>
              Produtos
            </h3>

            <p className="welcome-text">
              Cadastre produtos, acompanhe preços,
              estoque e informações importantes de cada item.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={abrirCadastroProduto}
          >
            + Novo produto
          </button>
        </section>

        <section className="cards">
          <article className="card">
            <div className="card-top">
              <span>Total de produtos</span>
              <span className="card-icon">📦</span>
            </div>

            <strong>
              {totalProdutos}
            </strong>

            <small>
              Produtos cadastrados
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Estoque baixo</span>
              <span className="card-icon">⚠️</span>
            </div>

            <strong>
              {produtosEstoqueBaixo}
            </strong>

            <small>
              Produtos precisam de reposição
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Sem estoque</span>
              <span className="card-icon">🚫</span>
            </div>

            <strong>
              {produtosSemEstoque}
            </strong>

            <small>
              Produtos indisponíveis
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Valor em estoque</span>
              <span className="card-icon">💰</span>
            </div>

            <strong>
              {formatarMoeda(valorEstoque)}
            </strong>

            <small>
              Valor pelo preço de custo
            </small>
          </article>
        </section>

        {mostrarFormularioProduto &&
          renderFormularioProduto()}

        <article className="panel">
          <div className="panel-header product-list-header">
            <div>
              <p className="eyebrow">CADASTRO</p>
              <h3>Lista de produtos</h3>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={abrirCadastroProduto}
            >
              + Cadastrar
            </button>
          </div>

          <div className="product-toolbar">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar por nome, código de barras ou categoria..."
                value={buscaProduto}
                onChange={(evento) => setBuscaProduto(evento.target.value)}
              />
              {buscaProduto && (
                <button
                  type="button"
                  className="clear-search-button"
                  onClick={() => setBuscaProduto('')}
                  title="Limpar busca"
                >
                  ×
                </button>
              )}
            </div>

            <span className="product-count">
              {produtosFiltrados.length} de {totalProdutos} produto(s)
            </span>
          </div>

          {renderListaProdutos()}
        </article>
      </>
    )
  }

  function renderVendas() {
    const vendasHoje = vendas.filter(
      (venda) =>
        chaveDataLocal(venda.criadaEm) === chaveHoje &&
        venda.status !== 'cancelada',
    )
    const faturamentoHoje = vendasHoje.reduce(
      (total, venda) => total + Number(venda.total || 0),
      0,
    )
    const itensVendidosHoje = vendasHoje.reduce(
      (total, venda) =>
        total +
        (venda.itens || []).reduce(
          (soma, item) => soma + Number(item.quantidade || 0),
          0,
        ),
      0,
    )
    const ticketMedio =
      vendasHoje.length > 0
        ? faturamentoHoje / vendasHoje.length
        : 0

    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">PDV</p>
            <h3>Vendas</h3>
            <p className="welcome-text">
              Registre vendas e acompanhe o movimento do caixa em tempo real.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={iniciarVenda}
          >
            + Iniciar venda
          </button>
        </section>

        <section className="cards">
          <article className="card">
            <div className="card-top">
              <span>Vendas hoje</span>
              <span className="card-icon">🛒</span>
            </div>
            <strong>{vendasHoje.length}</strong>
            <small>Operações realizadas</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Faturamento hoje</span>
              <span className="card-icon">💰</span>
            </div>
            <strong>{formatarMoeda(faturamentoHoje)}</strong>
            <small>Total vendido</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Ticket médio</span>
              <span className="card-icon">🧾</span>
            </div>
            <strong>{formatarMoeda(ticketMedio)}</strong>
            <small>Média por venda</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Itens vendidos</span>
              <span className="card-icon">📦</span>
            </div>
            <strong>{itensVendidosHoje}</strong>
            <small>Produtos vendidos hoje</small>
          </article>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">MOVIMENTO</p>
              <h3>Últimas vendas</h3>
            </div>
          </div>

          {vendas.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhuma venda realizada ainda.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Data</th>
                    <th>Pagamento</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.slice(0, 10).map((venda) => (
                    <tr key={venda.id}>
                      <td><strong>#{venda.id}</strong></td>
                      <td>
                        {new Date(venda.criadaEm).toLocaleString('pt-BR')}
                      </td>
                      <td>{venda.formaPagamento}</td>
                      <td>
                        {(venda.itens || []).reduce(
                          (soma, item) =>
                            soma + Number(item.quantidade || 0),
                          0,
                        )}
                      </td>
                      <td>{formatarMoeda(venda.total)}</td>
                      <td>
                        <span
                          className={`product-status ${
                            venda.status === 'cancelada'
                              ? 'status-danger'
                              : 'status-normal'
                          }`}
                        >
                          {venda.status === 'cancelada'
                            ? 'Cancelada'
                            : 'Concluída'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </>
    )
  }

  function renderClientes() {
    const editando = Boolean(clienteEmEdicao)

    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">RELACIONAMENTO E FIDELIZAÇÃO</p>
            <h3>Clientes</h3>
            <p className="welcome-text">
              Cadastre clientes, identifique participantes do clube e prepare
              o sistema para promoções personalizadas no PDV.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={abrirCadastroCliente}
          >
            + Novo cliente
          </button>
        </section>

        <section className="cards">
          <article className="card">
            <div className="card-top">
              <span>Total de clientes</span>
              <span className="card-icon">👥</span>
            </div>
            <strong>{clientes.length}</strong>
            <small>Clientes cadastrados</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Clube Estação</span>
              <span className="card-icon">⭐</span>
            </div>
            <strong>{clientesClube}</strong>
            <small>Participantes do clube</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Clientes ativos</span>
              <span className="card-icon">✅</span>
            </div>
            <strong>{clientesAtivos}</strong>
            <small>Cadastros ativos</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Com documento</span>
              <span className="card-icon">🪪</span>
            </div>
            <strong>{clientes.filter((item) => item.cpfCnpj).length}</strong>
            <small>CPF/CNPJ informado</small>
          </article>
        </section>

        {mostrarFormularioCliente && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  {editando ? 'EDIÇÃO DE CADASTRO' : 'NOVO CADASTRO'}
                </p>
                <h3>{editando ? 'Editar cliente' : 'Cadastrar cliente'}</h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={fecharCadastroCliente}
              >
                Fechar
              </button>
            </div>

            <form className="product-form" onSubmit={salvarCliente}>
              <div className="form-group form-group-large">
                <label htmlFor="clienteNome">Nome completo *</label>
                <input
                  id="clienteNome"
                  name="nome"
                  type="text"
                  placeholder="Ex.: João da Silva"
                  value={novoCliente.nome}
                  onChange={alterarCampoCliente}
                />
              </div>

              <div className="form-group">
                <label htmlFor="clienteCpfCnpj">CPF/CNPJ</label>
                <input
                  id="clienteCpfCnpj"
                  name="cpfCnpj"
                  type="text"
                  placeholder="000.000.000-00"
                  value={novoCliente.cpfCnpj}
                  onChange={alterarCampoCliente}
                />
              </div>

              <div className="form-group">
                <label htmlFor="clienteTelefone">Telefone</label>
                <input
                  id="clienteTelefone"
                  name="telefone"
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={novoCliente.telefone}
                  onChange={alterarCampoCliente}
                />
              </div>

              <div className="form-group form-group-large">
                <label htmlFor="clienteEmail">E-mail</label>
                <input
                  id="clienteEmail"
                  name="email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={novoCliente.email}
                  onChange={alterarCampoCliente}
                />
              </div>

              <div className="form-group">
                <label htmlFor="clienteNascimento">Data de nascimento</label>
                <input
                  id="clienteNascimento"
                  name="nascimento"
                  type="date"
                  value={novoCliente.nascimento}
                  onChange={alterarCampoCliente}
                />
              </div>

              <div className="form-group">
                <label>Status do cadastro</label>
                <label className="checkbox-option">
                  <input
                    name="ativo"
                    type="checkbox"
                    checked={novoCliente.ativo}
                    onChange={alterarCampoCliente}
                  />
                  Cliente ativo
                </label>
              </div>

              <div className="form-group">
                <label>Fidelização</label>
                <label className="checkbox-option">
                  <input
                    name="clube"
                    type="checkbox"
                    checked={novoCliente.clube}
                    onChange={alterarCampoCliente}
                  />
                  Participa do Clube Estação
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharCadastroCliente}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-button">
                  {editando ? 'Salvar alterações' : 'Salvar cliente'}
                </button>
              </div>
            </form>
          </article>
        )}

        <article className="panel">
          <div className="panel-header product-list-header">
            <div>
              <p className="eyebrow">CADASTRO</p>
              <h3>Lista de clientes</h3>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={abrirCadastroCliente}
            >
              + Cadastrar
            </button>
          </div>

          <div className="product-toolbar">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar por nome, CPF/CNPJ, telefone ou e-mail..."
                value={buscaCliente}
                onChange={(evento) => setBuscaCliente(evento.target.value)}
              />
              {buscaCliente && (
                <button
                  type="button"
                  className="clear-search-button"
                  onClick={() => setBuscaCliente('')}
                  title="Limpar busca"
                >
                  ×
                </button>
              )}
            </div>

            <span className="product-count">
              {clientesFiltrados.length} de {clientes.length} cliente(s)
            </span>
          </div>

          {clientes.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhum cliente cadastrado ainda.</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhum cliente encontrado para esta busca.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table customers-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>CPF/CNPJ</th>
                    <th>Telefone</th>
                    <th>Clube</th>
                    <th>Status</th>
                    <th className="actions-column">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td><strong>{cliente.nome}</strong></td>
                      <td>{cliente.cpfCnpj || '-'}</td>
                      <td>{cliente.telefone || '-'}</td>
                      <td>
                        <span className={`product-status ${cliente.clube ? 'status-normal' : ''}`}>
                          {cliente.clube ? 'Membro' : 'Não'}
                        </span>
                      </td>
                      <td>
                        <span className={`product-status ${cliente.ativo !== false ? 'status-normal' : 'status-danger'}`}>
                          {cliente.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="product-actions">
                        <button
                          type="button"
                          className="table-action-button"
                          onClick={() => editarCliente(cliente)}
                          title="Editar cliente"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="table-action-button danger"
                          onClick={() => excluirCliente(cliente)}
                          title="Excluir cliente"
                        >
                          🗑️ Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </>
    )
  }

  function renderFornecedores() {
    const editando = Boolean(fornecedorEmEdicao)

    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">COMPRAS E ABASTECIMENTO</p>
            <h3>Fornecedores</h3>
            <p className="welcome-text">
              Organize seus fornecedores e prepare o sistema para pedidos,
              compras e entrada de mercadorias.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={abrirCadastroFornecedor}
          >
            + Novo fornecedor
          </button>
        </section>

        <section className="cards supplier-cards">
          <article className="card">
            <div className="card-top">
              <span>Total de fornecedores</span>
              <span className="card-icon">🚚</span>
            </div>
            <strong>{fornecedores.length}</strong>
            <small>Fornecedores cadastrados</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Com CNPJ</span>
              <span className="card-icon">🏢</span>
            </div>
            <strong>{fornecedores.filter((item) => item.cnpj).length}</strong>
            <small>Cadastros empresariais</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Com telefone</span>
              <span className="card-icon">☎️</span>
            </div>
            <strong>{fornecedores.filter((item) => item.telefone).length}</strong>
            <small>Contatos disponíveis</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Com e-mail</span>
              <span className="card-icon">✉️</span>
            </div>
            <strong>{fornecedores.filter((item) => item.email).length}</strong>
            <small>Contatos digitais</small>
          </article>
        </section>

        {mostrarFormularioFornecedor && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  {editando ? 'EDIÇÃO DE CADASTRO' : 'NOVO CADASTRO'}
                </p>
                <h3>
                  {editando ? 'Editar fornecedor' : 'Cadastrar fornecedor'}
                </h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={fecharCadastroFornecedor}
              >
                Fechar
              </button>
            </div>

            <form className="product-form" onSubmit={salvarFornecedor}>
              <div className="form-group form-group-large">
                <label htmlFor="fornecedorNome">Razão social / Nome *</label>
                <input
                  id="fornecedorNome"
                  name="nome"
                  type="text"
                  placeholder="Ex.: Distribuidora Estação Ltda."
                  value={novoFornecedor.nome}
                  onChange={alterarCampoFornecedor}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fornecedorCnpj">CNPJ</label>
                <input
                  id="fornecedorCnpj"
                  name="cnpj"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={novoFornecedor.cnpj}
                  onChange={alterarCampoFornecedor}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fornecedorTelefone">Telefone</label>
                <input
                  id="fornecedorTelefone"
                  name="telefone"
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={novoFornecedor.telefone}
                  onChange={alterarCampoFornecedor}
                />
              </div>

              <div className="form-group form-group-large">
                <label htmlFor="fornecedorEmail">E-mail</label>
                <input
                  id="fornecedorEmail"
                  name="email"
                  type="email"
                  placeholder="contato@fornecedor.com.br"
                  value={novoFornecedor.email}
                  onChange={alterarCampoFornecedor}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={fecharCadastroFornecedor}
                >
                  Cancelar
                </button>

                <button type="submit" className="primary-button">
                  {editando ? 'Salvar alterações' : 'Salvar fornecedor'}
                </button>
              </div>
            </form>
          </article>
        )}

        <article className="panel">
          <div className="panel-header product-list-header">
            <div>
              <p className="eyebrow">CADASTRO</p>
              <h3>Lista de fornecedores</h3>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={abrirCadastroFornecedor}
            >
              + Cadastrar
            </button>
          </div>

          <div className="product-toolbar">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Buscar por nome, CNPJ, telefone ou e-mail..."
                value={buscaFornecedor}
                onChange={(evento) => setBuscaFornecedor(evento.target.value)}
              />
              {buscaFornecedor && (
                <button
                  type="button"
                  className="clear-search-button"
                  onClick={() => setBuscaFornecedor('')}
                  title="Limpar busca"
                >
                  ×
                </button>
              )}
            </div>

            <span className="product-count">
              {fornecedoresFiltrados.length} de {fornecedores.length}{' '}
              fornecedor(es)
            </span>
          </div>

          {fornecedores.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhum fornecedor cadastrado ainda.</p>
            </div>
          ) : fornecedoresFiltrados.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhum fornecedor encontrado para esta busca.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table suppliers-table">
                <thead>
                  <tr>
                    <th>Fornecedor</th>
                    <th>CNPJ</th>
                    <th>Telefone</th>
                    <th>E-mail</th>
                    <th className="actions-column">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {fornecedoresFiltrados.map((fornecedor) => (
                    <tr key={fornecedor.id}>
                      <td><strong>{fornecedor.nome}</strong></td>
                      <td>{fornecedor.cnpj || '-'}</td>
                      <td>{fornecedor.telefone || '-'}</td>
                      <td>{fornecedor.email || '-'}</td>
                      <td className="product-actions">
                        <button
                          type="button"
                          className="table-action-button"
                          onClick={() => editarFornecedor(fornecedor)}
                          title="Editar fornecedor"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="table-action-button danger"
                          onClick={() => excluirFornecedor(fornecedor)}
                          title="Excluir fornecedor"
                        >
                          🗑️ Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </>
    )
  }

  function exportarRelatorioExcel() {
    const vendasValidas = vendas.filter(
      (venda) => venda.status !== 'cancelada',
    )

    const linhas = [
      ['RELATÓRIO ESTAÇÃOCLOUD'],
      [],
      ['RESUMO'],
      ['Vendas concluídas', vendasValidas.length],
      [
        'Faturamento',
        vendasValidas
          .reduce(
            (total, venda) => total + Number(venda.total || 0),
            0,
          )
          .toFixed(2),
      ],
      [
        'Descontos',
        vendasValidas
          .reduce(
            (total, venda) =>
              total + Number(venda.desconto || 0),
            0,
          )
          .toFixed(2),
      ],
      [],
      ['VENDAS'],
      [
        'ID',
        'Data',
        'Pagamento',
        'Itens',
        'Desconto',
        'Total',
        'Status',
      ],
      ...vendasValidas.map((venda) => [
        `#${venda.id}`,
        new Date(venda.criadaEm).toLocaleString('pt-BR'),
        venda.formaPagamento || '-',
        (venda.itens || []).reduce(
          (soma, item) =>
            soma + Number(item.quantidade || 0),
          0,
        ),
        Number(venda.desconto || 0).toFixed(2),
        Number(venda.total || 0).toFixed(2),
        'Concluída',
      ]),
      [],
      ['ESTOQUE'],
      [
        'Produto',
        'Código de barras',
        'Categoria',
        'Estoque',
        'Estoque mínimo',
        'Custo',
        'Valor em estoque',
      ],
      ...produtos.map((produto) => [
        produto.nome || '-',
        `="${String(produto.codigoBarras || '')}"`,
        produto.categoria || '-',
        Number(produto.estoque || 0),
        Number(produto.estoqueMinimo || 0),
        Number(produto.precoCusto || 0).toFixed(2),
        (
          Number(produto.precoCusto || 0) *
          Number(produto.estoque || 0)
        ).toFixed(2),
      ]),
    ]

    const escaparCSV = (valor) => {
      const texto = String(valor ?? '')
      return `"${texto.replace(/"/g, '""')}"`
    }

    const csv = linhas
      .map((linha) =>
        linha.map(escaparCSV).join(';'),
      )
      .join('\r\n')

    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `relatorio-estacaocloud-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function renderRelatorios() {
    const vendasValidas = vendas.filter(
      (venda) => venda.status !== 'cancelada',
    )

    const vendasCanceladas = vendas.filter(
      (venda) => venda.status === 'cancelada',
    ).length

    const faturamentoTotal = vendasValidas.reduce(
      (total, venda) => total + Number(venda.total || 0),
      0,
    )

    const descontosTotal = vendasValidas.reduce(
      (total, venda) =>
        total + Number(venda.desconto || 0),
      0,
    )

    const itensVendidos = vendasValidas.reduce(
      (total, venda) =>
        total +
        (venda.itens || []).reduce(
          (soma, item) =>
            soma + Number(item.quantidade || 0),
          0,
        ),
      0,
    )

    const ticketMedio =
      vendasValidas.length > 0
        ? faturamentoTotal / vendasValidas.length
        : 0

    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              INTELIGÊNCIA DO NEGÓCIO
            </p>

            <h3>
              Relatórios
            </h3>

            <p className="welcome-text">
              Consulte os indicadores diretamente no sistema
              e exporte para Excel somente quando precisar.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={exportarRelatorioExcel}
          >
            📊 Exportar para Excel
          </button>
        </section>

        <section className="cards">
          <article className="card">
            <div className="card-top">
              <span>Faturamento</span>
              <span className="card-icon">💰</span>
            </div>
            <strong>{formatarMoeda(faturamentoTotal)}</strong>
            <small>Total de vendas concluídas</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Vendas</span>
              <span className="card-icon">🛒</span>
            </div>
            <strong>{vendasValidas.length}</strong>
            <small>{vendasCanceladas} cancelada(s)</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Ticket médio</span>
              <span className="card-icon">🧾</span>
            </div>
            <strong>{formatarMoeda(ticketMedio)}</strong>
            <small>Média por venda</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Descontos</span>
              <span className="card-icon">🏷️</span>
            </div>
            <strong>{formatarMoeda(descontosTotal)}</strong>
            <small>Descontos concedidos</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">VENDAS</p>
                <h3>Resumo operacional</h3>
              </div>
            </div>

            <div className="quick-actions">
              <button type="button">
                🛒 {vendasValidas.length} venda(s) concluída(s)
              </button>
              <button type="button">
                📦 {itensVendidos} item(ns) vendido(s)
              </button>
              <button type="button">
                🧾 {formatarMoeda(ticketMedio)} de ticket médio
              </button>
              <button type="button">
                💰 {formatarMoeda(faturamentoTotal)} faturados
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ESTOQUE</p>
                <h3>Posição atual</h3>
              </div>
            </div>

            <div className="quick-actions">
              <button type="button">
                📦 {totalProdutos} produto(s) cadastrado(s)
              </button>
              <button type="button">
                ⚠️ {produtosEstoqueBaixo} com estoque baixo
              </button>
              <button type="button">
                🚫 {produtosSemEstoque} sem estoque
              </button>
              <button type="button">
                💰 {formatarMoeda(valorEstoque)} em estoque
              </button>
            </div>
          </article>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">MOVIMENTO</p>
              <h3>Vendas registradas</h3>
            </div>
          </div>

          {vendas.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhuma venda registrada ainda.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Venda</th>
                    <th>Data</th>
                    <th>Pagamento</th>
                    <th>Itens</th>
                    <th>Desconto</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {vendas.map((venda) => (
                    <tr key={venda.id}>
                      <td>
                        <strong>#{venda.id}</strong>
                      </td>

                      <td>
                        {new Date(venda.criadaEm).toLocaleString('pt-BR')}
                      </td>

                      <td>{venda.formaPagamento || '-'}</td>

                      <td>
                        {(venda.itens || []).reduce(
                          (soma, item) =>
                            soma + Number(item.quantidade || 0),
                          0,
                        )}
                      </td>

                      <td>
                        {formatarMoeda(venda.desconto)}
                      </td>

                      <td>
                        {formatarMoeda(venda.total)}
                      </td>

                      <td>
                        <span
                          className={`product-status ${
                            venda.status === 'cancelada'
                              ? 'status-danger'
                              : 'status-normal'
                          }`}
                        >
                          {venda.status === 'cancelada'
                            ? 'Cancelada'
                            : 'Concluída'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">ESTOQUE</p>
              <h3>Posição dos produtos</h3>
            </div>
          </div>

          {produtos.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhum produto cadastrado.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Código</th>
                    <th>Categoria</th>
                    <th>Estoque</th>
                    <th>Mínimo</th>
                    <th>Custo</th>
                    <th>Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {produtos.map((produto) => (
                    <tr key={produto.id}>
                      <td>
                        <strong>{produto.nome}</strong>
                      </td>

                      <td>{produto.codigoBarras || '-'}</td>
                      <td>{produto.categoria || '-'}</td>
                      <td>{produto.estoque}</td>
                      <td>{produto.estoqueMinimo}</td>
                      <td>{formatarMoeda(produto.precoCusto)}</td>
                      <td>
                        {formatarMoeda(
                          Number(produto.precoCusto || 0) *
                            Number(produto.estoque || 0),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </>
    )
  }

  function renderConfiguracoes() {
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              SISTEMA
            </p>

            <h3>
              Configurações
            </h3>

            <p className="welcome-text">
              Configure os dados da empresa, usuários,
              preferências e parâmetros do EstaçãoCloud.
            </p>
          </div>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                EMPRESA
              </p>

              <h3>
                Configurações gerais
              </h3>
            </div>
          </div>

          <div className="quick-actions">
            <button type="button">
              🏪 Dados da empresa
            </button>

            <button type="button">
              👥 Usuários e permissões
            </button>

            <button type="button">
              🧾 Configurações fiscais
            </button>

            <button type="button">
              💳 Formas de pagamento
            </button>
          </div>
        </article>
      </>
    )
  }

  function renderConteudoPagina() {
    switch (pagina) {
      case 'produtos':
        return renderProdutos()

      case 'vendas':
        return renderVendas()

      case 'clientes':
        return renderClientes()

      case 'fornecedores':
        return renderFornecedores()

      case 'relatorios':
        return renderRelatorios()

      case 'configuracoes':
        return renderConfiguracoes()

      default:
        return renderVisaoGeral()
    }
  }

  if (verificandoSessao) {
    return (
      <div className="login-page">
        <div className="login-card">
          <p>Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!token || !usuarioLogado) {
    return <Login onLogin={concluirLogin} />
  }

  if (ambiente === 'pdv') {
    return (
      <Pdv
        usuario={usuarioLogado}
        token={token}
        onSair={sairDoSistema}
      />
    )
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            E
          </div>

          <div>
            <h1>
              EstaçãoCloud
            </h1>

            <p>
              {ambiente === 'estoque'
                ? 'Operação de estoque e cadastro'
                : 'Gestão inteligente para o varejo'}
            </p>
          </div>
        </div>

        <nav className="menu">
          {ambiente === 'estoque' ? (
            <>
              <button
                type="button"
                className={`menu-item ${
                  pagina === 'produtos' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('produtos')}
              >
                📦 Produtos
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'fornecedores' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('fornecedores')}
              >
                🚚 Fornecedores
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`menu-item ${
                  pagina === 'visao-geral' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('visao-geral')}
              >
                🏠 Visão geral
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'produtos' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('produtos')}
              >
                📦 Produtos
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'vendas' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('vendas')}
              >
                🛒 Vendas
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'clientes' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('clientes')}
              >
                👥 Clientes
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'fornecedores' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('fornecedores')}
              >
                🚚 Fornecedores
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'relatorios' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('relatorios')}
              >
                📊 Relatórios
              </button>

              <button
                type="button"
                className={`menu-item ${
                  pagina === 'configuracoes' ? 'active' : ''
                }`}
                onClick={() => abrirPagina('configuracoes')}
              >
                ⚙️ Configurações
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot"></span>

          Sistema online
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              {ambiente === 'estoque'
                ? 'PAINEL OPERACIONAL'
                : 'PAINEL ADMINISTRATIVO'}
            </p>

            <h2>
              {paginas[pagina].icone}{' '}
              {paginas[pagina].titulo}
            </h2>
          </div>

          <div className="user-box">
            <div className="user-avatar">
              {(usuarioLogado.nome || 'U').charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>
                {usuarioLogado.nome || 'Usuário'}
              </strong>

              <span>
                {usuarioLogado.perfil || 'operador'}
              </span>
            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={sairDoSistema}
              title="Sair do sistema"
            >
              Sair
            </button>
          </div>
        </header>

        {renderConteudoPagina()}
      </main>
    </div>
  )
}

export default App