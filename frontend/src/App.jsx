import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [pagina, setPagina] = useState('visao-geral')
  const [mostrarFormularioProduto, setMostrarFormularioProduto] =
    useState(false)

  const [produtos, setProdutos] = useState(() => {
    try {
      const produtosSalvos = localStorage.getItem('estacaocloud-produtos')
      return produtosSalvos ? JSON.parse(produtosSalvos) : []
    } catch {
      return []
    }
  })
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
    try {
      localStorage.setItem('estacaocloud-produtos', JSON.stringify(produtos))
    } catch (erro) {
      console.error('Erro ao salvar produtos:', erro)
    }
  }, [produtos])

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
    setPagina(nomePagina)
    setMostrarFormularioProduto(false)
    setMostrarFormularioFornecedor(false)
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

  function salvarProduto(evento) {
    evento.preventDefault()

    if (
      !novoProduto.nome.trim() ||
      !novoProduto.precoVenda ||
      novoProduto.estoque === ''
    ) {
      alert('Preencha pelo menos nome, preço de venda e estoque.')
      return
    }

    const dadosProduto = {
      codigoBarras: novoProduto.codigoBarras.trim(),
      nome: novoProduto.nome.trim(),
      categoria: novoProduto.categoria.trim(),
      precoCusto: Number(novoProduto.precoCusto || 0),
      precoVenda: Number(novoProduto.precoVenda || 0),
      estoque: Number(novoProduto.estoque || 0),
      estoqueMinimo: Number(novoProduto.estoqueMinimo || 0),
    }

    if (produtoEmEdicao) {
      setProdutos((listaAtual) =>
        listaAtual.map((produto) =>
          produto.id === produtoEmEdicao.id
            ? { ...produto, ...dadosProduto }
            : produto,
        ),
      )
    } else {
      setProdutos((listaAtual) => [
        ...listaAtual,
        { id: Date.now(), ...dadosProduto },
      ])
    }

    setNovoProduto(produtoVazio)
    setProdutoEmEdicao(null)
    setMostrarFormularioProduto(false)
  }

  function editarProduto(produto) {
    setProdutoEmEdicao(produto)
    setNovoProduto({
      codigoBarras: produto.codigoBarras || '',
      nome: produto.nome || '',
      categoria: produto.categoria || '',
      precoCusto: String(produto.precoCusto ?? ''),
      precoVenda: String(produto.precoVenda ?? ''),
      estoque: String(produto.estoque ?? ''),
      estoqueMinimo: String(produto.estoqueMinimo ?? ''),
    })
    setMostrarFormularioProduto(true)
  }

  function excluirProduto(produto) {
    const confirmou = window.confirm(
      `Deseja realmente excluir o produto "${produto.nome}"?`,
    )

    if (!confirmou) return

    setProdutos((listaAtual) =>
      listaAtual.filter((item) => item.id !== produto.id),
    )

    if (produtoEmEdicao?.id === produto.id) {
      fecharCadastroProduto()
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

  function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

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

            <strong>R$ 0,00</strong>

            <small>
              Nenhuma venda registrada
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

            <strong>0</strong>

            <small>
              Nenhum cliente cadastrado
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
                onClick={() => abrirPagina('clientes')}
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
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              PDV
            </p>

            <h3>
              Vendas
            </h3>

            <p className="welcome-text">
              Registre vendas e acompanhe o movimento
              do caixa em tempo real.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
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

            <strong>0</strong>

            <small>
              Operações realizadas
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Faturamento hoje</span>
              <span className="card-icon">💰</span>
            </div>

            <strong>
              R$ 0,00
            </strong>

            <small>
              Total vendido
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Ticket médio</span>
              <span className="card-icon">🧾</span>
            </div>

            <strong>
              R$ 0,00
            </strong>

            <small>
              Média por venda
            </small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Itens vendidos</span>
              <span className="card-icon">📦</span>
            </div>

            <strong>0</strong>

            <small>
              Produtos vendidos hoje
            </small>
          </article>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                MOVIMENTO
              </p>

              <h3>
                Últimas vendas
              </h3>
            </div>
          </div>

          <div className="empty-chart">
            <p>
              Nenhuma venda realizada ainda.
            </p>
          </div>
        </article>
      </>
    )
  }

  function renderClientes() {
    return (
      <>
        <section className="welcome">
          <div>
            <p className="eyebrow">
              RELACIONAMENTO
            </p>

            <h3>
              Clientes
            </h3>

            <p className="welcome-text">
              Mantenha os dados dos clientes organizados
              e acompanhe o histórico de compras.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
          >
            + Novo cliente
          </button>
        </section>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                CADASTRO
              </p>

              <h3>
                Lista de clientes
              </h3>
            </div>
          </div>

          <div className="empty-chart">
            <p>
              Nenhum cliente cadastrado ainda.
            </p>
          </div>
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

  function renderRelatorios() {
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
              Acompanhe vendas, estoque e desempenho
              da operação através de indicadores.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
          >
            Gerar relatório
          </button>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  VENDAS
                </p>

                <h3>
                  Desempenho
                </h3>
              </div>
            </div>

            <div className="empty-chart">
              <p>
                Os dados de vendas aparecerão aqui.
              </p>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">
                  ESTOQUE
                </p>

                <h3>
                  Movimentação
                </h3>
              </div>
            </div>

            <div className="empty-chart">
              <p>
                Os dados de estoque aparecerão aqui.
              </p>
            </div>
          </article>
        </section>
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
              Gestão inteligente para o varejo
            </p>
          </div>
        </div>

        <nav className="menu">
          <button
            type="button"
            className={`menu-item ${
              pagina === 'visao-geral'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('visao-geral')
            }
          >
            🏠 Visão geral
          </button>

          <button
            type="button"
            className={`menu-item ${
              pagina === 'produtos'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('produtos')
            }
          >
            📦 Produtos
          </button>

          <button
            type="button"
            className={`menu-item ${
              pagina === 'vendas'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('vendas')
            }
          >
            🛒 Vendas
          </button>

          <button
            type="button"
            className={`menu-item ${
              pagina === 'clientes'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('clientes')
            }
          >
            👥 Clientes
          </button>

          <button
            type="button"
            className={`menu-item ${
              pagina === 'fornecedores'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('fornecedores')
            }
          >
            🚚 Fornecedores
          </button>

          <button
            type="button"
            className={`menu-item ${
              pagina === 'relatorios'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('relatorios')
            }
          >
            📊 Relatórios
          </button>

          <button
            type="button"
            className={`menu-item ${
              pagina === 'configuracoes'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              abrirPagina('configuracoes')
            }
          >
            ⚙️ Configurações
          </button>
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
              PAINEL ADMINISTRATIVO
            </p>

            <h2>
              {paginas[pagina].icone}{' '}
              {paginas[pagina].titulo}
            </h2>
          </div>

          <div className="user-box">
            <div className="user-avatar">
              A
            </div>

            <div>
              <strong>
                Administrador
              </strong>

              <span>
                EstaçãoCloud
              </span>
            </div>
          </div>
        </header>

        {renderConteudoPagina()}
      </main>
    </div>
  )
}

export default App