import './App.css'

function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">E</div>
          <div>
            <h1>EstaçãoCloud</h1>
            <p>Gestão inteligente para o varejo</p>
          </div>
        </div>

        <nav className="menu">
          <button className="menu-item active">🏠 Visão geral</button>
          <button className="menu-item">📦 Produtos</button>
          <button className="menu-item">🛒 Vendas</button>
          <button className="menu-item">👥 Clientes</button>
          <button className="menu-item">🚚 Fornecedores</button>
          <button className="menu-item">📊 Relatórios</button>
          <button className="menu-item">⚙️ Configurações</button>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot"></span>
          Sistema online
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">PAINEL ADMINISTRATIVO</p>
            <h2>Visão geral</h2>
          </div>

          <div className="user-box">
            <div className="user-avatar">A</div>
            <div>
              <strong>Administrador</strong>
              <span>EstaçãoCloud</span>
            </div>
          </div>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">BEM-VINDO AO ESTAÇÃOCLOUD</p>
            <h3>Controle sua operação em um só lugar.</h3>
            <p className="welcome-text">
              Estoque, vendas, clientes, fornecedores e desempenho do seu
              negócio de forma simples, rápida e organizada.
            </p>
          </div>

          <button className="primary-button">+ Nova venda</button>
        </section>

        <section className="cards">
          <article className="card">
            <div className="card-top">
              <span>Vendas hoje</span>
              <span className="card-icon">💰</span>
            </div>

            <strong>R$ 0,00</strong>
            <small>Nenhuma venda registrada</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Produtos cadastrados</span>
              <span className="card-icon">📦</span>
            </div>

            <strong>0</strong>
            <small>Cadastre seu primeiro produto</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Estoque baixo</span>
              <span className="card-icon">⚠️</span>
            </div>

            <strong>0</strong>
            <small>Nenhum alerta no momento</small>
          </article>

          <article className="card">
            <div className="card-top">
              <span>Clientes</span>
              <span className="card-icon">👥</span>
            </div>

            <strong>0</strong>
            <small>Nenhum cliente cadastrado</small>
          </article>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">MOVIMENTO</p>
                <h3>Resumo de vendas</h3>
              </div>

              <button className="secondary-button">Ver relatório</button>
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

              <p>As vendas aparecerão aqui</p>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">ATALHOS</p>
                <h3>Acesso rápido</h3>
              </div>
            </div>

            <div className="quick-actions">
              <button>📦 Cadastrar produto</button>
              <button>🛒 Registrar venda</button>
              <button>👤 Cadastrar cliente</button>
              <button>🚚 Novo fornecedor</button>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App