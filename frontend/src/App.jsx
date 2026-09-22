import { useEffect, useState } from 'react'
import Login from './components/Login'
import Pdv from './components/pdv/Pdv'
import PlataformaAdmin from './components/PlataformaAdmin'
import {
  MovimentacoesEstoque,
  InventarioEstoque,
  EtiquetasGondola,
} from './components/estoque/EstoqueOperacao'
import RecebimentoMercadorias from './components/estoque/RecebimentoMercadorias'
import './App.css'
import LotesValidades from './components/estoque/LotesValidades'

const API_URL = 'http://localhost:3000'

function App() {
  const [acessoPlataforma, setAcessoPlataforma] = useState(false)

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
  const [historicoCaixas, setHistoricoCaixas] = useState([])
  const [carregandoHistoricoCaixas, setCarregandoHistoricoCaixas] = useState(false)
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

  const [categorias, setCategorias] = useState([])
  const [mostrarCategorias, setMostrarCategorias] = useState(false)
  const [nomeNovaCategoria, setNomeNovaCategoria] = useState('')

  async function carregarCategorias() {
    if (!token) {
      setCategorias([])
      return
    }

    try {
      const resposta = await fetch('http://localhost:3000/api/categorias', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        console.error('Erro ao carregar categorias:', dados.erro)
        return
      }

      setCategorias(
        Array.isArray(dados)
          ? dados
          : Array.isArray(dados.categorias)
            ? dados.categorias
            : [],
      )
    } catch (erro) {
      console.error('Erro ao carregar categorias:', erro)
    }
  }

  useEffect(() => {
    carregarCategorias()
  }, [token])

  async function salvarCategoria(evento) {
    evento.preventDefault()

    const nome = nomeNovaCategoria.trim()
    if (!nome) return

    try {
      const resposta = await fetch(
        'http://localhost:3000/api/categorias',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nome }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível criar a categoria.')
        return
      }

      setCategorias((atuais) =>
        [...atuais, dados].sort((a, b) =>
          a.nome.localeCompare(b.nome),
        ),
      )

      setNomeNovaCategoria('')
    } catch (erro) {
      console.error('Erro ao criar categoria:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  async function alternarCategoria(categoria) {
    try {
      const resposta = await fetch(
        `http://localhost:3000/api/categorias/${categoria.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ativo: !categoria.ativo,
          }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível alterar a categoria.')
        return
      }

      setCategorias((atuais) =>
        atuais.map((item) =>
          item.id === dados.id ? dados : item,
        ),
      )
    } catch (erro) {
      console.error('Erro ao alterar categoria:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  async function excluirCategoria(categoria) {
    if (!window.confirm(`Excluir a categoria "${categoria.nome}"?`)) {
      return
    }

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/categorias/${categoria.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível excluir a categoria.')
        return
      }

      setCategorias((atuais) =>
        atuais.filter((item) => item.id !== categoria.id),
      )
    } catch (erro) {
      console.error('Erro ao excluir categoria:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  const usuarioVazio = {
    nome: '',
    email: '',
    senha: '',
    perfil: 'operador',
  }

  const [usuariosSistema, setUsuariosSistema] = useState([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false)
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false)
  const [mostrarFormularioUsuario, setMostrarFormularioUsuario] = useState(false)
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState(null)
  const [novoUsuarioSistema, setNovoUsuarioSistema] = useState(usuarioVazio)

  // PREFERÊNCIAS
  const [mostrarPreferencias, setMostrarPreferencias] = useState(false)
  const [carregandoPreferencias, setCarregandoPreferencias] = useState(false)
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false)

  const [preferencias, setPreferencias] = useState({
    permiteEstoqueNegativo: false,
    mensagemComprovante: '',
  })

  async function abrirPreferencias() {
    setMostrarUsuarios(false)
    setMostrarTef(false)
    setMostrarDadosFiscais(false)
    setMostrarPreferencias(true)
    setCarregandoPreferencias(true)

    try {
      const resposta = await fetch(
        `${API_URL}/api/empresas/minha-empresa`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível carregar as preferências.',
        )
      }

      const empresa = dados.empresa || {}

      setPreferencias({
        permiteEstoqueNegativo:
          Boolean(empresa.permite_estoque_negativo),
        mensagemComprovante:
          empresa.mensagem_comprovante || '',
      })
    } catch (erro) {
      alert(erro.message)
    } finally {
      setCarregandoPreferencias(false)
    }
  }

  async function salvarPreferencias() {
    setSalvandoPreferencias(true)

    try {
      const resposta = await fetch(
        `${API_URL}/api/empresas/minha-empresa`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(preferencias),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível salvar as preferências.',
        )
      }

      alert('Preferências salvas com sucesso.')
    } catch (erro) {
      alert(erro.message)
    } finally {
      setSalvandoPreferencias(false)
    }
  }

  // TEF / CARTÕES
  // DADOS FISCAIS / NFC-e
  const [mostrarDadosFiscais, setMostrarDadosFiscais] = useState(false)
  const [carregandoDadosFiscais, setCarregandoDadosFiscais] = useState(false)
  const [salvandoDadosFiscais, setSalvandoDadosFiscais] = useState(false)

  const [dadosFiscais, setDadosFiscais] = useState({
    cnpj: '',
    inscricaoEstadual: '',
    regimeTributario: '',
    codigoMunicipioIbge: '',
    nfceHabilitada: false,
    nfceAmbiente: 'homologacao',
    nfceSerie: 1,
    nfceProximoNumero: 1,
    nfceCscId: '',
    nfceCsc: '',
  })

  async function carregarDadosFiscais() {
    setCarregandoDadosFiscais(true)

    try {
      const resposta = await fetch(
        `${API_URL}/api/empresas/minha-empresa`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível carregar os dados fiscais.',
        )
      }

      const empresa = dados.empresa || {}

      setDadosFiscais({
        cnpj: empresa.cnpj || '',
        inscricaoEstadual: empresa.inscricao_estadual || '',
        regimeTributario: empresa.regime_tributario || '',
        codigoMunicipioIbge: empresa.codigo_municipio_ibge || '',
        nfceHabilitada: Boolean(empresa.nfce_habilitada),
        nfceAmbiente: empresa.nfce_ambiente || 'homologacao',
        nfceSerie: empresa.nfce_serie || 1,
        nfceProximoNumero: empresa.nfce_proximo_numero || 1,
        nfceCscId: empresa.nfce_csc_id || '',
        nfceCsc: empresa.nfce_csc || '',
      })
    } catch (erro) {
      alert(erro.message)
    } finally {
      setCarregandoDadosFiscais(false)
    }
  }

  async function abrirDadosFiscais() {
    setMostrarUsuarios(false)
    setMostrarTef(false)
    setMostrarDadosFiscais(true)
    await carregarDadosFiscais()
  }

  async function salvarDadosFiscais() {
    setSalvandoDadosFiscais(true)

    try {
      const resposta = await fetch(
        `${API_URL}/api/empresas/minha-empresa`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(dadosFiscais),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro || 'Não foi possível salvar os dados fiscais.',
        )
      }

      alert('Dados fiscais salvos com sucesso.')
    } catch (erro) {
      alert(erro.message)
    } finally {
      setSalvandoDadosFiscais(false)
    }
  }

  const [mostrarTef, setMostrarTef] = useState(false)
  const [carregandoTef, setCarregandoTef] = useState(false)
  const [salvandoTef, setSalvandoTef] = useState(false)

  const [configuracaoTef, setConfiguracaoTef] = useState({
    habilitado: false,
    modo: 'simulacao',
    provedor: '',
    identificadorTerminal: '',
  })

  async function carregarConfiguracaoTef() {
    setCarregandoTef(true)

    try {
      const resposta = await fetch(
        `${API_URL}/api/tef/configuracao`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(
          dados.erro ||
            'Não foi possível carregar o TEF.',
        )
      }

      const terminal001 =
        dados.configuracao?.terminais?.find(
          (item) => item.terminal === '001',
        )

      setConfiguracaoTef({
        habilitado:
          Boolean(dados.configuracao?.habilitado),
        modo:
          dados.configuracao?.modo || 'simulacao',
        provedor:
          dados.configuracao?.provedor || '',
        identificadorTerminal:
          terminal001?.identificador_tef || '',
      })
    } catch (erro) {
      alert(erro.message)
    } finally {
      setCarregandoTef(false)
    }
  }

  async function abrirConfiguracaoTef() {
    setMostrarUsuarios(false)
    setMostrarTef(true)
    await carregarConfiguracaoTef()
  }

  async function salvarConfiguracaoTef() {
    setSalvandoTef(true)

    try {
      const respostaConfiguracao = await fetch(
        `${API_URL}/api/tef/configuracao`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            habilitado: configuracaoTef.habilitado,
            modo: configuracaoTef.modo,
            provedor:
              configuracaoTef.provedor.trim(),
          }),
        },
      )

      const dadosConfiguracao =
        await respostaConfiguracao.json()

      if (!respostaConfiguracao.ok) {
        throw new Error(
          dadosConfiguracao.erro ||
            'Não foi possível salvar o TEF.',
        )
      }

      const respostaTerminal = await fetch(
        `${API_URL}/api/tef/terminais/001`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            identificadorTef:
              configuracaoTef.identificadorTerminal.trim(),
            ativo: true,
          }),
        },
      )

      const dadosTerminal =
        await respostaTerminal.json()

      if (!respostaTerminal.ok) {
        throw new Error(
          dadosTerminal.erro ||
            'Não foi possível configurar o terminal TEF.',
        )
      }

      alert('Configuração TEF salva com sucesso.')
    } catch (erro) {
      alert(erro.message)
    } finally {
      setSalvandoTef(false)
    }
  }

  async function carregarUsuariosSistema() {
    if (!token || !['admin', 'gerente'].includes(usuarioLogado?.perfil)) {
      setUsuariosSistema([])
      return
    }

    try {
      setCarregandoUsuarios(true)
      const resposta = await fetch('http://localhost:3000/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível carregar os usuários.')
        return
      }

      setUsuariosSistema(Array.isArray(dados.usuarios) ? dados.usuarios : [])
    } catch (erro) {
      console.error('Erro ao carregar usuários:', erro)
      alert('Não foi possível conectar ao servidor.')
    } finally {
      setCarregandoUsuarios(false)
    }
  }

  async function abrirGerenciamentoUsuarios() {
    setMostrarUsuarios(true)
    setMostrarFormularioUsuario(false)
    setUsuarioEmEdicao(null)
    setNovoUsuarioSistema(usuarioVazio)
    await carregarUsuariosSistema()
  }

  function fecharFormularioUsuario() {
    setMostrarFormularioUsuario(false)
    setUsuarioEmEdicao(null)
    setNovoUsuarioSistema(usuarioVazio)
  }

  function alterarCampoUsuario(evento) {
    const { name, value } = evento.target
    setNovoUsuarioSistema((atual) => ({ ...atual, [name]: value }))
  }

  function iniciarNovoUsuario() {
    setUsuarioEmEdicao(null)
    setNovoUsuarioSistema(usuarioVazio)
    setMostrarFormularioUsuario(true)
  }

  function editarUsuarioSistema(usuario) {
    setUsuarioEmEdicao(usuario)
    setNovoUsuarioSistema({
      nome: usuario.nome || '',
      email: usuario.email || '',
      senha: '',
      perfil: usuario.perfil || 'operador',
    })
    setMostrarFormularioUsuario(true)
  }

  async function salvarUsuarioSistema(evento) {
    evento.preventDefault()

    if (usuarioLogado?.perfil !== 'admin') {
      alert('Somente o administrador pode cadastrar ou editar usuários.')
      return
    }

    const payload = {
      nome: novoUsuarioSistema.nome.trim(),
      email: novoUsuarioSistema.email.trim(),
      perfil: novoUsuarioSistema.perfil,
    }

    if (!usuarioEmEdicao) payload.senha = novoUsuarioSistema.senha

    if (!payload.nome || !payload.email || (!usuarioEmEdicao && !payload.senha)) {
      alert('Preencha nome, e-mail, senha e perfil.')
      return
    }

    try {
      const url = usuarioEmEdicao
        ? `http://localhost:3000/api/usuarios/${usuarioEmEdicao.id}`
        : 'http://localhost:3000/api/usuarios'

      const resposta = await fetch(url, {
        method: usuarioEmEdicao ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível salvar o usuário.')
        return
      }

      await carregarUsuariosSistema()
      fecharFormularioUsuario()
      alert(usuarioEmEdicao ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.')
    } catch (erro) {
      console.error('Erro ao salvar usuário:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  async function alternarStatusUsuario(usuario) {
    if (usuarioLogado?.perfil !== 'admin') {
      alert('Somente o administrador pode alterar usuários.')
      return
    }

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/usuarios/${usuario.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ativo: usuario.ativo === false }),
        },
      )
      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível alterar o status.')
        return
      }

      await carregarUsuariosSistema()
    } catch (erro) {
      console.error('Erro ao alterar status do usuário:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  async function redefinirSenhaUsuario(usuario) {
    if (usuarioLogado?.perfil !== 'admin') {
      alert('Somente o administrador pode redefinir senhas.')
      return
    }

    const senha = window.prompt(`Digite a nova senha de ${usuario.nome} (mínimo 6 caracteres):`)
    if (senha === null) return
    if (senha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/usuarios/${usuario.id}/senha`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ senha }),
        },
      )
      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível redefinir a senha.')
        return
      }

      alert('Senha redefinida com sucesso.')
    } catch (erro) {
      console.error('Erro ao redefinir senha:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
  }

  const produtoVazio = {
    codigoBarras: '',
    nome: '',
    categoria: '',
    precoCusto: '',
    precoVenda: '',
    clubeAtivo: false,
    precoClube: '',
    estoque: '',
    estoqueMinimo: '',
    unidade: 'UN',
    pesavel: false,
    plu: '',
    fornecedorId: '',
    etiquetaAtiva: true,

    // DADOS FISCAIS
    ncm: '',
    cest: '',
    origemMercadoria: '',
    cstIcms: '',
    csosn: '',
    cfop: '',
    cstIbsCbs: '',
    cclassTrib: '',
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
            clubeAtivo: Boolean(
              produto.clubeAtivo ?? produto.clube_ativo
            ),
            precoClube:
              produto.precoClube ??
              produto.preco_clube ??
              '',
            estoque: Number(produto.estoque || 0),
            estoqueMinimo: Number(produto.estoqueMinimo || 0),

            ncm: produto.ncm || '',
            cest: produto.cest || '',
            origemMercadoria: produto.origemMercadoria || '',
            cstIcms: produto.cstIcms || '',
            csosn: produto.csosn || '',
            cfop: produto.cfop || '',
            cstIbsCbs: produto.cstIbsCbs || '',
            cclassTrib: produto.cclassTrib || '',
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

  const [fornecedores, setFornecedores] = useState([])
  const [buscaFornecedor, setBuscaFornecedor] = useState('')
  const [fornecedorEmEdicao, setFornecedorEmEdicao] = useState(null)
  const [mostrarFormularioFornecedor, setMostrarFormularioFornecedor] =
    useState(false)
  const [novoFornecedor, setNovoFornecedor] = useState(fornecedorVazio)

  async function carregarFornecedores() {
    if (!token) {
      setFornecedores([])
      return
    }

    try {
      const resposta = await fetch(
        'http://localhost:3000/api/fornecedores',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        console.error('Erro ao carregar fornecedores:', dados.erro)
        return
      }

      setFornecedores(
        Array.isArray(dados)
          ? dados
          : Array.isArray(dados.fornecedores)
            ? dados.fornecedores
            : [],
      )
    } catch (erro) {
      console.error('Erro ao carregar fornecedores:', erro)
    }
  }

  useEffect(() => {
    carregarFornecedores()
  }, [token])


  const clienteVazio = {
    nome: '',
    cpfCnpj: '',
    telefone: '',
    email: '',
    nascimento: '',
    clube: true,
    ativo: true,
  }

  const [clientes, setClientes] = useState([])
  const [buscaCliente, setBuscaCliente] = useState('')
  const [clienteEmEdicao, setClienteEmEdicao] = useState(null)
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false)
  const [novoCliente, setNovoCliente] = useState(clienteVazio)

  async function carregarClientes() {
    if (!token) {
      setClientes([])
      return
    }

    try {
      const resposta = await fetch(
        'http://localhost:3000/api/clientes',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        console.error('Erro ao carregar clientes:', dados.erro)
        return
      }

      setClientes(
        Array.isArray(dados)
          ? dados
          : Array.isArray(dados.clientes)
            ? dados.clientes
            : [],
      )
    } catch (erro) {
      console.error('Erro ao carregar clientes:', erro)
    }
  }

  useEffect(() => {
    carregarClientes()
  }, [token])


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

  useEffect(() => {
    async function carregarHistoricoCaixas() {
      if (!token) {
        setHistoricoCaixas([])
        return
      }

      try {
        setCarregandoHistoricoCaixas(true)

        const resposta = await fetch(
          'http://localhost:3000/api/caixa/historico',
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        const dados = await resposta.json()

        if (!resposta.ok) {
          console.error('Erro ao carregar histórico de caixas:', dados.erro)
          setHistoricoCaixas([])
          return
        }

        setHistoricoCaixas(Array.isArray(dados.caixas) ? dados.caixas : [])
      } catch (erro) {
        console.error('Erro ao carregar histórico de caixas:', erro)
        setHistoricoCaixas([])
      } finally {
        setCarregandoHistoricoCaixas(false)
      }
    }

    carregarHistoricoCaixas()
  }, [token, pagina])

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
            clubeAtivo: Boolean(
              produto.clubeAtivo ?? produto.clube_ativo
            ),
            precoClube:
              produto.precoClube ??
              produto.preco_clube ??
              '',
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
    const { name, value, type, checked } = evento.target

    setNovoProduto((produtoAtual) => ({
      ...produtoAtual,
      [name]: type === 'checkbox' ? checked : value,
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

    if (
      novoProduto.clubeAtivo &&
      (
        novoProduto.precoClube === '' ||
        !Number.isFinite(Number(novoProduto.precoClube)) ||
        Number(novoProduto.precoClube) < 0
      )
    ) {
      alert('Informe um preço válido para o Clube Estação.')
      return
    }

    if (
      novoProduto.pesavel &&
      !String(novoProduto.plu || '').trim()
    ) {
      alert('Produto pesável precisa possuir um PLU.')
      return
    }

    if (
      !novoProduto.codigoBarras.trim() &&
      !String(novoProduto.plu || '').trim()
    ) {
      alert('Informe o código de barras ou o PLU do produto.')
      return
    }

    const payload = {
      codigoBarras: novoProduto.codigoBarras.trim(),
      nome: novoProduto.nome.trim(),
      categoria: novoProduto.categoria.trim(),
      custo: Number(novoProduto.precoCusto || 0),
      preco: Number(novoProduto.precoVenda || 0),
      clubeAtivo: Boolean(novoProduto.clubeAtivo),
      precoClube: novoProduto.clubeAtivo
        ? Number(novoProduto.precoClube)
        : null,
      estoque: Number(novoProduto.estoque || 0),
      estoqueMinimo: Number(novoProduto.estoqueMinimo || 0),
      unidade: novoProduto.unidade || 'UN',
      pesavel: Boolean(novoProduto.pesavel),
      plu: String(novoProduto.plu || '').trim(),

      // DADOS FISCAIS
      ncm: String(novoProduto.ncm || '').trim(),
      cest: String(novoProduto.cest || '').trim(),
      origemMercadoria: String(
        novoProduto.origemMercadoria || '',
      ).trim(),
      cstIcms: String(
        novoProduto.cstIcms || '',
      ).trim(),
      csosn: String(
        novoProduto.csosn || '',
      ).trim(),
      cfop: String(
        novoProduto.cfop || '',
      ).trim(),
      cstIbsCbs: String(
        novoProduto.cstIbsCbs || '',
      ).trim(),
      cclassTrib: String(
        novoProduto.cclassTrib || '',
      ).trim(),

      fornecedorId: novoProduto.fornecedorId
        ? Number(novoProduto.fornecedorId)
        : null,
      etiquetaAtiva: Boolean(novoProduto.etiquetaAtiva),
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
        clubeAtivo: Boolean(
          dados.produto.clubeAtivo ??
          dados.produto.clube_ativo
        ),
        precoClube:
          dados.produto.precoClube ??
          dados.produto.preco_clube ??
          '',
        estoque: Number(dados.produto.estoque || 0),
        estoqueMinimo: Number(dados.produto.estoqueMinimo || 0),
        unidade: dados.produto.unidade || 'UN',
        pesavel: Boolean(dados.produto.pesavel),
        plu: dados.produto.plu || '',

        // DADOS FISCAIS
        ncm: dados.produto.ncm || '',
        cest: dados.produto.cest || '',
        origemMercadoria:
          dados.produto.origemMercadoria || '',
        cstIcms:
          dados.produto.cstIcms || '',
        csosn:
          dados.produto.csosn || '',
        cfop:
          dados.produto.cfop || '',
        cstIbsCbs:
          dados.produto.cstIbsCbs || '',
        cclassTrib:
          dados.produto.cclassTrib || '',

        fornecedorId:
          dados.produto.fornecedorId ??
          dados.produto.fornecedor_id ??
          null,
        fornecedorNome:
          dados.produto.fornecedorNome ??
          dados.produto.fornecedor_nome ??
          '',
        etiquetaAtiva: Boolean(
          dados.produto.etiquetaAtiva ??
          dados.produto.etiqueta_ativa ??
          true
        ),
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
      clubeAtivo: Boolean(
        produto.clubeAtivo ?? produto.clube_ativo
      ),
      precoClube: String(
        produto.precoClube ??
        produto.preco_clube ??
        ''
      ),
      estoque: String(produto.estoque ?? ''),
      estoqueMinimo: String(produto.estoqueMinimo ?? ''),
      unidade: produto.unidade || 'UN',
      pesavel: Boolean(produto.pesavel),
      plu: produto.plu || '',

      // DADOS FISCAIS
      ncm: produto.ncm || '',
      cest: produto.cest || '',
      origemMercadoria: produto.origemMercadoria || '',
      cstIcms: produto.cstIcms || '',
      csosn: produto.csosn || '',
      cfop: produto.cfop || '',
      cstIbsCbs: produto.cstIbsCbs || '',
      cclassTrib: produto.cclassTrib || '',

      fornecedorId: String(
        produto.fornecedorId ??
        produto.fornecedor_id ??
        ''
      ),
      etiquetaAtiva: Boolean(
        produto.etiquetaAtiva ??
        produto.etiqueta_ativa ??
        true
      ),
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

  async function salvarFornecedor(evento) {
    evento.preventDefault()

    if (!novoFornecedor.nome.trim()) {
      alert('Preencha pelo menos o nome do fornecedor.')
      return
    }

    const payload = {
      nome: novoFornecedor.nome.trim(),
      cnpj: novoFornecedor.cnpj.trim(),
      telefone: novoFornecedor.telefone.trim(),
      email: novoFornecedor.email.trim(),
    }

    try {
      const url = fornecedorEmEdicao
        ? `http://localhost:3000/api/fornecedores/${fornecedorEmEdicao.id}`
        : 'http://localhost:3000/api/fornecedores'

      const resposta = await fetch(url, {
        method: fornecedorEmEdicao ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível salvar o fornecedor.')
        return
      }

      await carregarFornecedores()
      fecharCadastroFornecedor()
    } catch (erro) {
      console.error('Erro ao salvar fornecedor:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
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

  async function excluirFornecedor(fornecedor) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o fornecedor "${fornecedor.nome}"?`,
    )

    if (!confirmou) return

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/fornecedores/${fornecedor.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível excluir o fornecedor.')
        return
      }

      await carregarFornecedores()

      if (fornecedorEmEdicao?.id === fornecedor.id) {
        fecharCadastroFornecedor()
      }
    } catch (erro) {
      console.error('Erro ao excluir fornecedor:', erro)
      alert('Não foi possível conectar ao servidor.')
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

  async function salvarCliente(evento) {
    evento.preventDefault()

    if (
      !novoCliente.nome.trim() ||
      !novoCliente.cpfCnpj.trim() ||
      !novoCliente.telefone.trim()
    ) {
      alert('Preencha nome, CPF/CNPJ e telefone.')
      return
    }

    const payload = {
      nome: novoCliente.nome.trim(),
      cpfCnpj: novoCliente.cpfCnpj.trim(),
      telefone: novoCliente.telefone.trim(),
      email: novoCliente.email.trim(),
      nascimento: novoCliente.nascimento || null,
      clube: Boolean(novoCliente.clube),
      ativo: Boolean(novoCliente.ativo),
    }

    try {
      const url = clienteEmEdicao
        ? `http://localhost:3000/api/clientes/${clienteEmEdicao.id}`
        : 'http://localhost:3000/api/clientes'

      const resposta = await fetch(url, {
        method: clienteEmEdicao ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível salvar o cliente.')
        return
      }

      await carregarClientes()
      fecharCadastroCliente()
    } catch (erro) {
      console.error('Erro ao salvar cliente:', erro)
      alert('Não foi possível conectar ao servidor.')
    }
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

  async function excluirCliente(cliente) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o cliente "${cliente.nome}"?`,
    )

    if (!confirmou) return

    try {
      const resposta = await fetch(
        `http://localhost:3000/api/clientes/${cliente.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        alert(dados.erro || 'Não foi possível excluir o cliente.')
        return
      }

      await carregarClientes()

      if (clienteEmEdicao?.id === cliente.id) {
        fecharCadastroCliente()
      }
    } catch (erro) {
      console.error('Erro ao excluir cliente:', erro)
      alert('Não foi possível conectar ao servidor.')
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
            <select
              id="categoria"
              name="categoria"
              value={novoProduto.categoria}
              onChange={alterarCampoProduto}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 11px',
                border: '1px solid #303c4b',
                borderRadius: '5px',
                outline: 'none',
                color: '#ffffff',
                background: '#0e151e',
              }}
            >
              <option value="">Selecione...</option>
              {categorias
                .filter(
                  (categoria) =>
                    categoria.ativo || categoria.nome === novoProduto.categoria,
                )
                .map((categoria) => (
                  <option key={categoria.id} value={categoria.nome}>
                    {categoria.nome}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="unidade">Unidade de medida *</label>
            <select
              id="unidade"
              name="unidade"
              value={novoProduto.unidade}
              onChange={alterarCampoProduto}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 11px',
                border: '1px solid #303c4b',
                borderRadius: '5px',
                outline: 'none',
                color: '#ffffff',
                background: '#0e151e',
              }}
            >
              <option value="UN">UN - Unidade</option>
              <option value="KG">KG - Quilograma</option>
              <option value="G">G - Grama</option>
              <option value="L">L - Litro</option>
              <option value="ML">ML - Mililitro</option>
              <option value="CX">CX - Caixa</option>
              <option value="PC">PC - Peça</option>
              <option value="PCT">PCT - Pacote</option>
              <option value="DZ">DZ - Dúzia</option>
            </select>
          </div>

          <div className="form-group">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '24px',
              }}
            >
              <input
                name="pesavel"
                type="checkbox"
                checked={Boolean(novoProduto.pesavel)}
                onChange={alterarCampoProduto}
              />
              Produto pesável / balança
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="plu">PLU</label>
            <input
              id="plu"
              name="plu"
              type="text"
              inputMode="numeric"
              placeholder={novoProduto.pesavel ? 'Ex.: 123' : 'Opcional'}
              value={novoProduto.plu}
              onChange={alterarCampoProduto}
            />
          </div>

          <div className="form-group">
            <label htmlFor="fornecedorId">Fornecedor</label>
            <select
              id="fornecedorId"
              name="fornecedorId"
              value={novoProduto.fornecedorId}
              onChange={alterarCampoProduto}
              style={{
                width: '100%',
                height: '38px',
                padding: '0 11px',
                border: '1px solid #303c4b',
                borderRadius: '5px',
                outline: 'none',
                color: '#ffffff',
                background: '#0e151e',
              }}
            >
              <option value="">Sem fornecedor vinculado</option>
              {fornecedores.map((fornecedor) => (
                <option
                  key={fornecedor.id}
                  value={fornecedor.id}
                >
                  {fornecedor.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '24px',
              }}
            >
              <input
                name="etiquetaAtiva"
                type="checkbox"
                checked={Boolean(novoProduto.etiquetaAtiva)}
                onChange={alterarCampoProduto}
              />
              Disponível para etiqueta de gôndola
            </label>
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
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '24px',
              }}
            >
              <input
                name="clubeAtivo"
                type="checkbox"
                checked={Boolean(novoProduto.clubeAtivo)}
                onChange={alterarCampoProduto}
              />
              Produto participa do Clube Estação
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="precoClube">Preço Clube</label>
            <input
              id="precoClube"
              name="precoClube"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={novoProduto.precoClube}
              onChange={alterarCampoProduto}
              disabled={!novoProduto.clubeAtivo}
            />
          </div>

          <div className="form-group">
            <label htmlFor="estoque">Estoque atual *</label>
            <input
              id="estoque"
              name="estoque"
              type="number"
              min="0"
              step={novoProduto.pesavel ? '0.001' : '1'}
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
              step={novoProduto.pesavel ? '0.001' : '1'}
              placeholder="0"
              value={novoProduto.estoqueMinimo}
              onChange={alterarCampoProduto}
            />
          </div>

          <div
            style={{
              gridColumn: '1 / -1',
              marginTop: '18px',
              padding: '18px',
              border: '1px solid #303c4b',
              borderRadius: '8px',
              background: '#0b121a',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <p className="eyebrow">FISCAL</p>
              <h4 style={{ margin: '4px 0 0' }}>
                Dados fiscais
              </h4>
              <p
                className="welcome-text"
                style={{ marginTop: '6px', marginBottom: 0 }}
              >
                Informe a classificação fiscal definida para este produto.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: '14px',
              }}
            >
              <div className="form-group">
                <label htmlFor="ncm">NCM</label>
                <input
                  id="ncm"
                  name="ncm"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Ex.: 10063021"
                  value={novoProduto.ncm}
                  onChange={alterarCampoProduto}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cest">CEST</label>
                <input
                  id="cest"
                  name="cest"
                  type="text"
                  inputMode="numeric"
                  maxLength={7}
                  placeholder="Ex.: 1700100"
                  value={novoProduto.cest}
                  onChange={alterarCampoProduto}
                />
              </div>

              <div className="form-group">
                <label htmlFor="origemMercadoria">
                  Origem da mercadoria
                </label>
                <select
                  id="origemMercadoria"
                  name="origemMercadoria"
                  value={novoProduto.origemMercadoria}
                  onChange={alterarCampoProduto}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 11px',
                    border: '1px solid #303c4b',
                    borderRadius: '5px',
                    outline: 'none',
                    color: '#ffffff',
                    background: '#0e151e',
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="0">
                    0 - Nacional
                  </option>
                  <option value="1">
                    1 - Estrangeira - importação direta
                  </option>
                  <option value="2">
                    2 - Estrangeira - adquirida no mercado interno
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="cfop">CFOP</label>
                <input
                  id="cfop"
                  name="cfop"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Ex.: 5102"
                  value={novoProduto.cfop}
                  onChange={alterarCampoProduto}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cstIcms">
                  CST ICMS
                </label>
                <input
                  id="cstIcms"
                  name="cstIcms"
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="Ex.: 00"
                  value={novoProduto.cstIcms}
                  onChange={alterarCampoProduto}
                />
              </div>

              <div className="form-group">
                <label htmlFor="csosn">
                  CSOSN
                </label>
                <input
                  id="csosn"
                  name="csosn"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Ex.: 102"
                  value={novoProduto.csosn}
                  onChange={alterarCampoProduto}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cstIbsCbs">
                  CST IBS/CBS
                </label>
                <input
                  id="cstIbsCbs"
                  name="cstIbsCbs"
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="Conforme classificação fiscal"
                  value={novoProduto.cstIbsCbs}
                  onChange={alterarCampoProduto}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cclassTrib">
                  cClassTrib IBS/CBS
                </label>
                <input
                  id="cclassTrib"
                  name="cclassTrib"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Código da classificação"
                  value={novoProduto.cclassTrib}
                  onChange={alterarCampoProduto}
                />
              </div>
            </div>
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

          <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setMostrarCategorias((atual) => !atual)}
            >
              🗂️ Categorias
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={abrirCadastroProduto}
            >
              + Novo produto
            </button>
          </div>
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

        {mostrarCategorias && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ORGANIZAÇÃO DO ESTOQUE</p>
                <h3>Categorias de produtos</h3>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setMostrarCategorias(false)}
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={salvarCategoria}
              style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}
            >
              <input
                type="text"
                placeholder="Nome da nova categoria"
                value={nomeNovaCategoria}
                onChange={(evento) => setNomeNovaCategoria(evento.target.value)}
                style={{
                  flex: 1,
                  height: '38px',
                  padding: '0 11px',
                  border: '1px solid #303c4b',
                  borderRadius: '5px',
                  outline: 'none',
                  color: '#fff',
                  background: '#0e151e',
                }}
              />
              <button type="submit" className="primary-button">
                + Adicionar categoria
              </button>
            </form>

            {categorias.length === 0 ? (
              <div className="empty-chart">
                <p>Nenhuma categoria cadastrada.</p>
              </div>
            ) : (
              <div className="products-table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th>Status</th>
                      <th className="actions-column">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorias.map((categoria) => (
                      <tr key={categoria.id}>
                        <td><strong>{categoria.nome}</strong></td>
                        <td>
                          <span
                            className={`product-status ${
                              categoria.ativo ? 'status-normal' : 'status-danger'
                            }`}
                          >
                            {categoria.ativo ? 'Ativa' : 'Inativa'}
                          </span>
                        </td>
                        <td className="product-actions">
                          <button
                            type="button"
                            className="table-action-button"
                            onClick={() => alternarCategoria(categoria)}
                          >
                            {categoria.ativo ? '⏸ Inativar' : '▶ Ativar'}
                          </button>
                          <button
                            type="button"
                            className="table-action-button danger"
                            onClick={() => excluirCategoria(categoria)}
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
        )}

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

    const caixasFechados = historicoCaixas.filter(
      (caixa) => caixa.status === 'fechado',
    )

    const totalDinheiroCaixas = caixasFechados.reduce(
      (total, caixa) => total + Number(caixa.vendasDinheiro || 0),
      0,
    )

    const totalSangriasCaixas = caixasFechados.reduce(
      (total, caixa) => total + Number(caixa.sangrias || 0),
      0,
    )

    const diferencaAcumuladaCaixas = caixasFechados.reduce(
      (total, caixa) => total + Number(caixa.diferenca || 0),
      0,
    )

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

        <article className="panel" style={{ marginBottom: '20px' }}>
          <div className="panel-header">
            <div>
              <p className="eyebrow">CONTROLE DE CAIXA</p>
              <h3>Histórico de caixas</h3>
            </div>
          </div>

          <section className="cards" style={{ marginBottom: '18px' }}>
            <article className="card">
              <div className="card-top">
                <span>Caixas fechados</span>
                <span className="card-icon">🔒</span>
              </div>
              <strong>{caixasFechados.length}</strong>
              <small>Turnos encerrados</small>
            </article>

            <article className="card">
              <div className="card-top">
                <span>Vendas em dinheiro</span>
                <span className="card-icon">💵</span>
              </div>
              <strong>{formatarMoeda(totalDinheiroCaixas)}</strong>
              <small>Movimento em espécie</small>
            </article>

            <article className="card">
              <div className="card-top">
                <span>Sangrias</span>
                <span className="card-icon">📤</span>
              </div>
              <strong>{formatarMoeda(totalSangriasCaixas)}</strong>
              <small>Total retirado dos caixas</small>
            </article>

            <article className="card">
              <div className="card-top">
                <span>Diferença acumulada</span>
                <span className="card-icon">⚖️</span>
              </div>
              <strong>{formatarMoeda(diferencaAcumuladaCaixas)}</strong>
              <small>Sobras e faltas somadas</small>
            </article>
          </section>

          {carregandoHistoricoCaixas ? (
            <div className="empty-chart">
              <p>Carregando histórico de caixas...</p>
            </div>
          ) : historicoCaixas.length === 0 ? (
            <div className="empty-chart">
              <p>Nenhum caixa registrado no histórico atual.</p>
            </div>
          ) : (
            <div className="products-table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Caixa</th>
                    <th>Abertura</th>
                    <th>Fechamento</th>
                    <th>Fundo</th>
                    <th>Dinheiro</th>
                    <th>Pix</th>
                    <th>Débito</th>
                    <th>Crédito</th>
                    <th>Sangrias</th>
                    <th>Teórico</th>
                    <th>Contado</th>
                    <th>Diferença</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoCaixas.map((caixa) => (
                    <tr key={caixa.id}>
                      <td><strong>{caixa.terminal || '-'}</strong></td>
                      <td>{caixa.abertoEm ? new Date(caixa.abertoEm).toLocaleString('pt-BR') : '-'}</td>
                      <td>{caixa.fechadoEm ? new Date(caixa.fechadoEm).toLocaleString('pt-BR') : '-'}</td>
                      <td>{formatarMoeda(caixa.valorInicial)}</td>
                      <td>{formatarMoeda(caixa.vendasDinheiro)}</td>
                      <td>{formatarMoeda(caixa.vendasPix)}</td>
                      <td>{formatarMoeda(caixa.vendasDebito)}</td>
                      <td>{formatarMoeda(caixa.vendasCredito)}</td>
                      <td>{formatarMoeda(caixa.sangrias)}</td>
                      <td>{caixa.saldoTeorico == null ? '-' : formatarMoeda(caixa.saldoTeorico)}</td>
                      <td>{caixa.valorInformadoFechamento == null ? '-' : formatarMoeda(caixa.valorInformadoFechamento)}</td>
                      <td>
                        <strong>{caixa.diferenca == null ? '-' : formatarMoeda(caixa.diferenca)}</strong>
                      </td>
                      <td>
                        <span className={`product-status ${caixa.status === 'fechado' ? 'status-normal' : 'status-warning'}`}>
                          {caixa.status === 'fechado' ? 'Fechado' : 'Aberto'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

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
    const podeConsultarUsuarios = ['admin', 'gerente'].includes(usuarioLogado?.perfil)
    const podeAdministrarUsuarios = usuarioLogado?.perfil === 'admin'

    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">SISTEMA</p>
            <h3>Configurações</h3>
            <p className="welcome-text">
              Configure os dados da empresa, usuários, preferências e parâmetros do EstaçãoCloud.
            </p>
          </div>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">EMPRESA</p>
              <h3>Configurações gerais</h3>
            </div>
          </div>

          <div className="quick-actions">
            <button type="button">🏪 Dados da empresa</button>

            <button
              type="button"
              onClick={podeConsultarUsuarios ? abrirGerenciamentoUsuarios : undefined}
              disabled={!podeConsultarUsuarios}
              title={!podeConsultarUsuarios ? 'Acesso permitido para administrador e gerente' : ''}
            >
              👥 Usuários e permissões
            </button>

            <button
              type="button"
              onClick={podeAdministrarUsuarios ? abrirDadosFiscais : undefined}
              disabled={!podeAdministrarUsuarios}
              title={!podeAdministrarUsuarios ? 'Acesso permitido para administrador' : ''}
            >
              🧾 Dados fiscais
            </button>

            <button
              type="button"
              onClick={
                podeAdministrarUsuarios
                  ? abrirConfiguracaoTef
                  : undefined
              }
              disabled={!podeAdministrarUsuarios}
              title={
                !podeAdministrarUsuarios
                  ? 'Acesso permitido para administrador'
                  : ''
              }
            >
              💳 TEF / Cartões
            </button>

            <button
              type="button"
              onClick={podeAdministrarUsuarios ? abrirPreferencias : undefined}
              disabled={!podeAdministrarUsuarios}
              title={!podeAdministrarUsuarios ? 'Acesso permitido para administrador' : ''}
            >
              🔔 Preferências
            </button>
          </div>
        </article>

        {mostrarPreferencias && podeAdministrarUsuarios && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">CONFIGURAÇÕES GERAIS</p>
                <h3>Preferências</h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setMostrarPreferencias(false)}
              >
                Fechar
              </button>
            </div>

            <p className="welcome-text" style={{ marginBottom: '18px' }}>
              Defina comportamentos gerais do EstaçãoCloud para este estabelecimento.
            </p>

            {carregandoPreferencias ? (
              <p>Carregando preferências...</p>
            ) : (
              <div className="product-form">
                <div className="form-group">
                  <label>Estoque negativo</label>

                  <select
                    value={preferencias.permiteEstoqueNegativo ? 'sim' : 'nao'}
                    onChange={(e) =>
                      setPreferencias((atual) => ({
                        ...atual,
                        permiteEstoqueNegativo: e.target.value === 'sim',
                      }))
                    }
                  >
                    <option value="nao">Não permitir</option>
                    <option value="sim">Permitir</option>
                  </select>
                </div>

                <div className="form-group form-group-large">
                  <label>Mensagem no comprovante</label>

                  <input
                    type="text"
                    value={preferencias.mensagemComprovante}
                    onChange={(e) =>
                      setPreferencias((atual) => ({
                        ...atual,
                        mensagemComprovante: e.target.value,
                      }))
                    }
                    placeholder="Ex.: Obrigado pela preferência!"
                    maxLength="200"
                  />
                </div>

                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={salvarPreferencias}
                    disabled={salvandoPreferencias}
                  >
                    {salvandoPreferencias
                      ? 'Salvando...'
                      : 'Salvar preferências'}
                  </button>
                </div>
              </div>
            )}
          </article>
        )}

        {mostrarDadosFiscais && podeAdministrarUsuarios && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">CONFIGURAÇÃO FISCAL</p>
                <h3>Dados Fiscais / NFC-e</h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setMostrarDadosFiscais(false)}
              >
                Fechar
              </button>
            </div>

            <p className="welcome-text" style={{ marginBottom: '18px' }}>
              Configure os dados fiscais do estabelecimento e os parâmetros da NFC-e.
            </p>

            {carregandoDadosFiscais ? (
              <p>Carregando dados fiscais...</p>
            ) : (
              <div className="product-form">
                <div className="form-group">
                  <label>CNPJ</label>
                  <input
                    type="text"
                    value={dadosFiscais.cnpj}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        cnpj: e.target.value,
                      }))
                    }
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="form-group">
                  <label>Inscrição Estadual</label>
                  <input
                    type="text"
                    value={dadosFiscais.inscricaoEstadual}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        inscricaoEstadual: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Regime tributário</label>
                  <select
                    value={dadosFiscais.regimeTributario}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        regimeTributario: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    <option value="simples_nacional">Simples Nacional</option>
                    <option value="simples_excesso">Simples Nacional — excesso de sublimite</option>
                    <option value="regime_normal">Regime Normal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Código município IBGE</label>
                  <input
                    type="text"
                    value={dadosFiscais.codigoMunicipioIbge}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        codigoMunicipioIbge: e.target.value,
                      }))
                    }
                    placeholder="Ex.: 3550308"
                  />
                </div>

                <div className="form-group">
                  <label>NFC-e</label>
                  <select
                    value={dadosFiscais.nfceHabilitada ? 'sim' : 'nao'}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        nfceHabilitada: e.target.value === 'sim',
                      }))
                    }
                  >
                    <option value="nao">Desativada</option>
                    <option value="sim">Ativada</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Ambiente NFC-e</label>
                  <select
                    value={dadosFiscais.nfceAmbiente}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        nfceAmbiente: e.target.value,
                      }))
                    }
                  >
                    <option value="homologacao">Homologação</option>
                    <option value="producao">Produção</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Série NFC-e</label>
                  <input
                    type="number"
                    min="1"
                    value={dadosFiscais.nfceSerie}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        nfceSerie: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Próximo número NFC-e</label>
                  <input
                    type="number"
                    min="1"
                    value={dadosFiscais.nfceProximoNumero}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        nfceProximoNumero: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>ID CSC</label>
                  <input
                    type="text"
                    value={dadosFiscais.nfceCscId}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        nfceCscId: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="form-group form-group-large">
                  <label>CSC — Código de Segurança do Contribuinte</label>
                  <input
                    type="password"
                    value={dadosFiscais.nfceCsc}
                    onChange={(e) =>
                      setDadosFiscais((atual) => ({
                        ...atual,
                        nfceCsc: e.target.value,
                      }))
                    }
                    autoComplete="off"
                  />
                </div>

                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={salvarDadosFiscais}
                    disabled={salvandoDadosFiscais}
                  >
                    {salvandoDadosFiscais
                      ? 'Salvando...'
                      : 'Salvar dados fiscais'}
                  </button>
                </div>
              </div>
            )}
          </article>
        )}

        {mostrarTef && podeAdministrarUsuarios && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  PAGAMENTOS INTEGRADOS
                </p>
                <h3>TEF / Cartões</h3>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setMostrarTef(false)}
              >
                Fechar
              </button>
            </div>

            <p
              className="welcome-text"
              style={{ marginBottom: '18px' }}
            >
              Configure a integração do PDV com pinpad e
              provedor TEF multiadquirente.
            </p>

            {carregandoTef ? (
              <p>Carregando configuração TEF...</p>
            ) : (
              <div className="product-form">
                <div className="form-group">
                  <label>Integração TEF</label>

                  <select
                    value={
                      configuracaoTef.habilitado
                        ? 'sim'
                        : 'nao'
                    }
                    onChange={(evento) =>
                      setConfiguracaoTef((atual) => ({
                        ...atual,
                        habilitado:
                          evento.target.value === 'sim',
                      }))
                    }
                  >
                    <option value="nao">
                      Desativada
                    </option>
                    <option value="sim">
                      Ativada
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Modo</label>

                  <select
                    value={configuracaoTef.modo}
                    onChange={(evento) =>
                      setConfiguracaoTef((atual) => ({
                        ...atual,
                        modo: evento.target.value,
                      }))
                    }
                  >
                    <option value="simulacao">
                      Simulação
                    </option>
                    <option value="producao">
                      Produção
                    </option>
                  </select>
                </div>

                <div className="form-group form-group-large">
                  <label>Provedor TEF</label>

                  <input
                    type="text"
                    value={configuracaoTef.provedor}
                    onChange={(evento) =>
                      setConfiguracaoTef((atual) => ({
                        ...atual,
                        provedor: evento.target.value,
                      }))
                    }
                    placeholder="Ex.: provedor multiadquirente"
                  />
                </div>

                <div className="form-group form-group-large">
                  <label>
                    Identificador TEF — Caixa 001
                  </label>

                  <input
                    type="text"
                    value={
                      configuracaoTef.identificadorTerminal
                    }
                    onChange={(evento) =>
                      setConfiguracaoTef((atual) => ({
                        ...atual,
                        identificadorTerminal:
                          evento.target.value,
                      }))
                    }
                    placeholder="Identificador fornecido pelo TEF"
                  />
                </div>

                <div
                  style={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                  }}
                >
                  <button
                    type="button"
                    className="primary-button"
                    onClick={salvarConfiguracaoTef}
                    disabled={salvandoTef}
                  >
                    {salvandoTef
                      ? 'Salvando...'
                      : 'Salvar configuração TEF'}
                  </button>
                </div>
              </div>
            )}
          </article>
        )}

        {mostrarUsuarios && podeConsultarUsuarios && (
          <article className="panel product-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ACESSO AO SISTEMA</p>
                <h3>Usuários e permissões</h3>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                {podeAdministrarUsuarios && (
                  <button type="button" className="primary-button" onClick={iniciarNovoUsuario}>
                    + Novo usuário
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setMostrarUsuarios(false)
                    fecharFormularioUsuario()
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>

            <p className="welcome-text" style={{ marginBottom: '16px' }}>
              Administrador controla os acessos. Gerente pode consultar a equipe. Operador fica
              restrito às funções operacionais autorizadas.
            </p>

            {mostrarFormularioUsuario && podeAdministrarUsuarios && (
              <form className="product-form" onSubmit={salvarUsuarioSistema}>
                <div className="form-group form-group-large">
                  <label htmlFor="usuarioNome">Nome *</label>
                  <input
                    id="usuarioNome"
                    name="nome"
                    type="text"
                    placeholder="Ex.: João da Silva"
                    value={novoUsuarioSistema.nome}
                    onChange={alterarCampoUsuario}
                  />
                </div>

                <div className="form-group form-group-large">
                  <label htmlFor="usuarioEmail">E-mail *</label>
                  <input
                    id="usuarioEmail"
                    name="email"
                    type="email"
                    placeholder="joao@empresa.com"
                    value={novoUsuarioSistema.email}
                    onChange={alterarCampoUsuario}
                  />
                </div>

                {!usuarioEmEdicao && (
                  <div className="form-group">
                    <label htmlFor="usuarioSenha">Senha *</label>
                    <input
                      id="usuarioSenha"
                      name="senha"
                      type="password"
                      minLength="6"
                      placeholder="Mínimo 6 caracteres"
                      value={novoUsuarioSistema.senha}
                      onChange={alterarCampoUsuario}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="usuarioPerfil">Perfil *</label>
                  <select
                    id="usuarioPerfil"
                    name="perfil"
                    value={novoUsuarioSistema.perfil}
                    onChange={alterarCampoUsuario}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 11px',
                      border: '1px solid #303c4b',
                      borderRadius: '5px',
                      outline: 'none',
                      color: '#ffffff',
                      background: '#0e151e',
                    }}
                  >
                    <option value="admin">Administrador</option>
                    <option value="gerente">Gerente</option>
                    <option value="operador">Operador</option>
                  </select>
                </div>

                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={fecharFormularioUsuario}>
                    Cancelar
                  </button>
                  <button type="submit" className="primary-button">
                    {usuarioEmEdicao ? 'Salvar alterações' : 'Criar usuário'}
                  </button>
                </div>
              </form>
            )}

            <div style={{ marginTop: '18px' }}>
              {carregandoUsuarios ? (
                <div className="empty-chart"><p>Carregando usuários...</p></div>
              ) : usuariosSistema.length === 0 ? (
                <div className="empty-chart">
                  <p>Nenhum usuário adicional cadastrado nesta empresa.</p>
                </div>
              ) : (
                <div className="products-table-wrapper">
                  <table className="products-table">
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>E-mail</th>
                        <th>Perfil</th>
                        <th>Status</th>
                        {podeAdministrarUsuarios && <th className="actions-column">Ações</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosSistema.map((usuario) => (
                        <tr key={usuario.id}>
                          <td><strong>{usuario.nome}</strong></td>
                          <td>{usuario.email}</td>
                          <td>
                            {usuario.perfil === 'admin'
                              ? 'Administrador'
                              : usuario.perfil === 'gerente'
                                ? 'Gerente'
                                : 'Operador'}
                          </td>
                          <td>
                            <span
                              className={`product-status ${
                                usuario.ativo === false ? 'status-danger' : 'status-normal'
                              }`}
                            >
                              {usuario.ativo === false ? 'Inativo' : 'Ativo'}
                            </span>
                          </td>
                          {podeAdministrarUsuarios && (
                            <td className="product-actions">
                              <button
                                type="button"
                                className="table-action-button"
                                onClick={() => editarUsuarioSistema(usuario)}
                              >
                                ✏️ Editar
                              </button>
                              <button
                                type="button"
                                className="table-action-button"
                                onClick={() => redefinirSenhaUsuario(usuario)}
                              >
                                🔑 Senha
                              </button>
                              <button
                                type="button"
                                className={`table-action-button ${
                                  usuario.ativo === false ? '' : 'danger'
                                }`}
                                onClick={() => alternarStatusUsuario(usuario)}
                              >
                                {usuario.ativo === false ? '▶ Ativar' : '⏸ Inativar'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </article>
        )}
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

      case 'movimentacoes-estoque':
        return (
          <MovimentacoesEstoque
            token={token}
            produtos={produtos}
          />
        )

      case 'inventario':
        return <InventarioEstoque token={token} />

      case 'recebimentos':
        return (
          <RecebimentoMercadorias
            token={token}
            produtos={produtos}
            fornecedores={fornecedores}
          />
        )

      case 'validades':
        return <LotesValidades token={token} />

      case 'etiquetas':
        return <EtiquetasGondola token={token} />

      case 'relatorios':
        return renderRelatorios()

      case 'configuracoes':
        return renderConfiguracoes()

      default:
        return renderVisaoGeral()
    }
  }

  if (acessoPlataforma) {
    return (
      <PlataformaAdmin
        onVoltar={() => setAcessoPlataforma(false)}
      />
    )
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
    return (
      <>
        <Login onLogin={concluirLogin} />
        <button
          type="button"
          onClick={() => setAcessoPlataforma(true)}
          style={{
            position: 'fixed',
            right: '18px',
            bottom: '18px',
            zIndex: 50,
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px 14px',
            background: '#0f172a',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Administração Estação Group
        </button>
      </>
    )
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

              <button
                type="button"
                className={`menu-item ${pagina === 'movimentacoes-estoque' ? 'active' : ''}`}
                onClick={() => abrirPagina('movimentacoes-estoque')}
              >
                🔄 Movimentações
              </button>

              <button
                type="button"
                className={`menu-item ${pagina === 'inventario' ? 'active' : ''}`}
                onClick={() => abrirPagina('inventario')}
              >
                📋 Inventário
              </button>

              <button
            className={`menu-item ${pagina === 'recebimentos' ? 'active' : ''}`}
            onClick={() => abrirPagina('recebimentos')}
          >
            📥 Recebimento
          </button>

              <button
                className={`menu-item ${pagina === 'validades' ? 'active' : ''}`}
                onClick={() => abrirPagina('validades')}
              >
                📅 Lotes / Validades
              </button>

          <button
                type="button"
                className={`menu-item ${pagina === 'etiquetas' ? 'active' : ''}`}
                onClick={() => abrirPagina('etiquetas')}
              >
                🏷️ Etiquetas
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
                className={`menu-item ${pagina === 'movimentacoes-estoque' ? 'active' : ''}`}
                onClick={() => abrirPagina('movimentacoes-estoque')}
              >
                🔄 Estoque
              </button>

              <button
                type="button"
                className={`menu-item ${pagina === 'inventario' ? 'active' : ''}`}
                onClick={() => abrirPagina('inventario')}
              >
                📋 Inventário
              </button>

              <button
            className={`menu-item ${pagina === 'recebimentos' ? 'active' : ''}`}
            onClick={() => abrirPagina('recebimentos')}
          >
            📥 Recebimento
          </button>

              <button
                className={`menu-item ${pagina === 'validades' ? 'active' : ''}`}
                onClick={() => abrirPagina('validades')}
              >
                📅 Lotes / Validades
              </button>

          <button
                type="button"
                className={`menu-item ${pagina === 'etiquetas' ? 'active' : ''}`}
                onClick={() => abrirPagina('etiquetas')}
              >
                🏷️ Etiquetas
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
              {paginas[pagina]?.icone}{' '}
              {paginas[pagina]?.titulo}
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
