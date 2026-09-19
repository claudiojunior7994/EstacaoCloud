import { useEffect, useMemo, useState } from 'react'

const API = 'http://localhost:3000/api/plataforma'

const empresaVazia = {
  nome: '',
  nomeFantasia: '',
  cnpj: '',
  email: '',
  telefone: '',
  adminNome: '',
  adminEmail: '',
  adminSenha: '',
}

const funcionarioVazio = {
  nome: '',
  email: '',
  senha: '',
  perfil: 'comercial',
}

function PlataformaAdmin({ onVoltar }) {
  const [token, setToken] = useState(
    () => localStorage.getItem('estacaogroup-token') || '',
  )
  const [usuario, setUsuario] = useState(() => {
    try {
      const salvo = localStorage.getItem('estacaogroup-usuario')
      return salvo ? JSON.parse(salvo) : null
    } catch {
      return null
    }
  })

  const [email, setEmail] = useState('admin@estacaogroup.local')
  const [senha, setSenha] = useState('123456')
  const [erroLogin, setErroLogin] = useState('')
  const [entrando, setEntrando] = useState(false)

  const [pagina, setPagina] = useState('empresas')
  const [empresas, setEmpresas] = useState([])
  const [equipe, setEquipe] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [carregando, setCarregando] = useState(false)

  const [mostrarEmpresa, setMostrarEmpresa] = useState(false)
  const [novaEmpresa, setNovaEmpresa] = useState(empresaVazia)

  const [mostrarFuncionario, setMostrarFuncionario] = useState(false)
  const [novoFuncionario, setNovoFuncionario] = useState(funcionarioVazio)

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }),
    [token],
  )

  function sair() {
    localStorage.removeItem('estacaogroup-token')
    localStorage.removeItem('estacaogroup-usuario')
    setToken('')
    setUsuario(null)
    setEmpresas([])
    setEquipe([])
    setAuditoria([])
  }

  async function requisicao(url, opcoes = {}) {
    const resposta = await fetch(url, {
      ...opcoes,
      headers: {
        ...headers,
        ...(opcoes.headers || {}),
      },
    })

    const dados = await resposta.json().catch(() => ({}))

    if (resposta.status === 401) {
      sair()
      throw new Error(dados.erro || 'Sessão expirada.')
    }

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Não foi possível concluir a operação.')
    }

    return dados
  }

  async function fazerLogin(evento) {
    evento.preventDefault()
    setErroLogin('')
    setEntrando(true)

    try {
      const resposta = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErroLogin(dados.erro || 'Não foi possível entrar.')
        return
      }

      localStorage.setItem('estacaogroup-token', dados.token)
      localStorage.setItem('estacaogroup-usuario', JSON.stringify(dados.usuario))
      setToken(dados.token)
      setUsuario(dados.usuario)
    } catch {
      setErroLogin('Não foi possível conectar ao servidor.')
    } finally {
      setEntrando(false)
    }
  }

  async function carregarEmpresas() {
    const dados = await requisicao(`${API}/admin/empresas`)
    setEmpresas(Array.isArray(dados) ? dados : [])
  }

  async function carregarEquipe() {
    const dados = await requisicao(`${API}/admin/equipe`)
    setEquipe(Array.isArray(dados) ? dados : [])
  }

  async function carregarAuditoria() {
    const dados = await requisicao(`${API}/admin/auditoria`)
    setAuditoria(Array.isArray(dados) ? dados : [])
  }

  useEffect(() => {
    if (!token || !usuario) return

    async function carregar() {
      try {
        setCarregando(true)
        if (pagina === 'empresas') await carregarEmpresas()
        if (pagina === 'equipe') await carregarEquipe()
        if (pagina === 'auditoria') await carregarAuditoria()
      } catch (erro) {
        alert(erro.message)
      } finally {
        setCarregando(false)
      }
    }

    carregar()
  }, [token, usuario, pagina])

  async function cadastrarEmpresa(evento) {
    evento.preventDefault()

    if (
      !novaEmpresa.nome.trim() ||
      !novaEmpresa.adminNome.trim() ||
      !novaEmpresa.adminEmail.trim() ||
      novaEmpresa.adminSenha.length < 6
    ) {
      alert('Preencha empresa, administrador, e-mail e senha de pelo menos 6 caracteres.')
      return
    }

    try {
      await requisicao(`${API}/admin/empresas`, {
        method: 'POST',
        body: JSON.stringify(novaEmpresa),
      })
      setNovaEmpresa(empresaVazia)
      setMostrarEmpresa(false)
      await carregarEmpresas()
      alert('Empresa e administrador cadastrados com sucesso.')
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function alterarEmpresa(empresa) {
    try {
      await requisicao(`${API}/admin/empresas/${empresa.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativa: empresa.ativa === false }),
      })
      await carregarEmpresas()
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function cadastrarFuncionario(evento) {
    evento.preventDefault()

    if (
      !novoFuncionario.nome.trim() ||
      !novoFuncionario.email.trim() ||
      novoFuncionario.senha.length < 6
    ) {
      alert('Preencha nome, e-mail e senha de pelo menos 6 caracteres.')
      return
    }

    try {
      await requisicao(`${API}/admin/equipe`, {
        method: 'POST',
        body: JSON.stringify(novoFuncionario),
      })
      setNovoFuncionario(funcionarioVazio)
      setMostrarFuncionario(false)
      await carregarEquipe()
      alert('Funcionário cadastrado com sucesso.')
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function alterarFuncionario(funcionario) {
    try {
      await requisicao(`${API}/admin/equipe/${funcionario.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ ativo: funcionario.ativo === false }),
      })
      await carregarEquipe()
    } catch (erro) {
      alert(erro.message)
    }
  }

  const css = {
    pagina: {
      minHeight: '100vh',
      background:
        'radial-gradient(circle at 15% 10%, rgba(37,99,235,.18), transparent 28%), radial-gradient(circle at 88% 88%, rgba(14,165,233,.10), transparent 30%), linear-gradient(135deg,#050911 0%,#08111d 48%,#05080e 100%)',
      color: '#edf5ff',
      fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
      padding: '28px',
      boxSizing: 'border-box',
    },
    container: { maxWidth: '1320px', margin: '0 auto' },
    topo: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '18px',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: '24px',
    },
    marca: {
      margin: '4px 0 0',
      fontSize: '30px',
      letterSpacing: '-0.7px',
      fontWeight: 800,
    },
    mutado: { color: '#8da2b8', margin: '7px 0 0', lineHeight: 1.5 },
    painel: {
      background: 'linear-gradient(180deg,rgba(15,27,41,.96),rgba(8,17,28,.97))',
      border: '1px solid #243c56',
      boxShadow: '0 22px 70px rgba(0,0,0,.34)',
      borderRadius: '16px',
      padding: '22px',
      marginBottom: '18px',
    },
    nav: {
      display: 'flex',
      gap: '9px',
      flexWrap: 'wrap',
      marginBottom: '18px',
      padding: '8px',
      background: 'rgba(9,18,29,.75)',
      border: '1px solid #1e3349',
      borderRadius: '12px',
      width: 'fit-content',
    },
    botao: {
      border: '1px solid #304a65',
      borderRadius: '9px',
      padding: '10px 15px',
      background: 'linear-gradient(180deg,#17283a,#101d2b)',
      color: '#e6f0fb',
      cursor: 'pointer',
      fontWeight: 700,
    },
    primario: {
      border: '1px solid #4c91ff',
      borderRadius: '9px',
      padding: '10px 16px',
      background: 'linear-gradient(135deg,#1677ff,#3158e8)',
      boxShadow: '0 8px 24px rgba(37,99,235,.22)',
      color: '#fff',
      cursor: 'pointer',
      fontWeight: 800,
    },
    perigo: {
      border: '1px solid #74383e',
      borderRadius: '8px',
      padding: '8px 12px',
      background: '#30171c',
      color: '#ffc2c8',
      cursor: 'pointer',
      fontWeight: 700,
    },
    input: {
      width: '100%',
      boxSizing: 'border-box',
      height: '46px',
      border: '1px solid #304861',
      borderRadius: '9px',
      padding: '0 13px',
      background: '#08121e',
      color: '#fff',
      outline: 'none',
      marginTop: '6px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(235px, 1fr))',
      gap: '14px',
    },
    tabelaWrap: {
      overflowX: 'auto',
      border: '1px solid #20354b',
      borderRadius: '11px',
      background: '#09131f',
    },
    tabela: { width: '100%', borderCollapse: 'collapse', minWidth: '780px' },
    th: {
      textAlign: 'left',
      padding: '13px',
      borderBottom: '1px solid #2a4057',
      background: '#0d1a28',
      color: '#8fa9c2',
      fontSize: '12px',
      letterSpacing: '.5px',
      textTransform: 'uppercase',
    },
    td: { padding: '13px', borderBottom: '1px solid #182a3c', color: '#dce8f5' },
  }

  if (!token || !usuario) {
    return (
      <div style={css.pagina}>
        <div
          style={{
            minHeight: 'calc(100vh - 56px)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div style={{ width: '100%', maxWidth: '1040px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1.15fr) minmax(360px,.85fr)',
                overflow: 'hidden',
                border: '1px solid #28435e',
                borderRadius: '22px',
                boxShadow: '0 35px 100px rgba(0,0,0,.5)',
                background: '#09131f',
              }}
            >
              <section
                style={{
                  minHeight: '500px',
                  padding: '52px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background:
                    'radial-gradient(circle at 18% 12%,rgba(46,126,255,.32),transparent 33%), linear-gradient(145deg,#0c1b2b,#07111c 68%)',
                  borderRight: '1px solid #243c55',
                }}
              >
                <div>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg,#1683ff,#344ce7)',
                      boxShadow: '0 12px 35px rgba(37,99,235,.35)',
                      fontSize: '27px',
                    }}
                  >
                    ◆
                  </div>

                  <p
                    style={{
                      color: '#55a4ff',
                      fontWeight: 900,
                      letterSpacing: '1.5px',
                      margin: '28px 0 8px',
                    }}
                  >
                    ESTAÇÃO GROUP
                  </p>

                  <h1
                    style={{
                      fontSize: '42px',
                      lineHeight: 1.08,
                      letterSpacing: '-1.4px',
                      maxWidth: '520px',
                      margin: 0,
                    }}
                  >
                    Tecnologia para mover negócios.
                  </h1>

                  <p
                    style={{
                      color: '#9bb0c6',
                      fontSize: '16px',
                      lineHeight: 1.65,
                      maxWidth: '500px',
                      marginTop: '18px',
                    }}
                  >
                    Central administrativa do EstaçãoCloud para gestão de
                    empresas clientes, equipe e operações da plataforma.
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '24px',
                    color: '#718ba5',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '.6px',
                  }}
                >
                  <span>ESTAÇÃOCLOUD</span>
                  <span>GESTÃO</span>
                  <span>TECNOLOGIA</span>
                </div>
              </section>

              <section
                style={{
                  padding: '52px 42px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(180deg,rgba(15,27,41,.98),rgba(8,16,26,.98))',
                }}
              >
                <p
                  style={{
                    color: '#5aa7ff',
                    fontSize: '12px',
                    fontWeight: 900,
                    letterSpacing: '1.2px',
                    margin: 0,
                  }}
                >
                  ACESSO RESTRITO
                </p>

                <h2 style={{ fontSize: '28px', margin: '8px 0 6px' }}>
                  Painel Estação Group
                </h2>

                <p style={{ ...css.mutado, marginBottom: '25px' }}>
                  Entre com sua conta administrativa.
                </p>

                <form
                  onSubmit={fazerLogin}
                  style={{ display: 'grid', gap: '17px' }}
                >
                  <label style={{ color: '#b9c9d9', fontSize: '13px', fontWeight: 700 }}>
                    E-mail
                    <input
                      style={css.input}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </label>

                  <label style={{ color: '#b9c9d9', fontSize: '13px', fontWeight: 700 }}>
                    Senha
                    <input
                      style={css.input}
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  {erroLogin && (
                    <div
                      style={{
                        color: '#ffc0c6',
                        background: '#32171d',
                        border: '1px solid #67313a',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        fontSize: '13px',
                      }}
                    >
                      {erroLogin}
                    </div>
                  )}

                  <button
                    style={{ ...css.primario, height: '46px', marginTop: '4px' }}
                    type="submit"
                    disabled={entrando}
                  >
                    {entrando ? 'Entrando...' : 'Entrar no painel'}
                  </button>

                  <button
                    style={{ ...css.botao, height: '44px' }}
                    type="button"
                    onClick={onVoltar}
                  >
                    ← Voltar ao EstaçãoCloud
                  </button>
                </form>

                <p
                  style={{
                    color: '#5f7489',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    margin: '24px 0 0',
                    textAlign: 'center',
                  }}
                >
                  Ambiente administrativo exclusivo da Estação Group
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const titulo =
    pagina === 'empresas'
      ? 'Empresas clientes'
      : pagina === 'equipe'
        ? 'Equipe Estação Group'
        : 'Auditoria'

  return (
    <div style={css.pagina}>
      <div style={css.container}>
        <header style={css.topo}>
          <div>
            <p style={{ color: '#60a5fa', fontWeight: 800, margin: 0 }}>ESTAÇÃO GROUP</p>
            <h1 style={css.marca}>Painel administrativo</h1>
            <p style={css.mutado}>
              {usuario.nome} · {usuario.perfil}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button style={css.botao} type="button" onClick={onVoltar}>
              EstaçãoCloud
            </button>
            <button style={css.botao} type="button" onClick={sair}>
              Sair
            </button>
          </div>
        </header>

        <nav style={css.nav}>
          {[
            ['empresas', '🏢 Empresas'],
            ['equipe', '👥 Equipe Estação Group'],
            ['auditoria', '🧾 Auditoria'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPagina(id)}
              style={pagina === id ? css.primario : css.botao}
            >
              {label}
            </button>
          ))}
        </nav>

        <section style={css.painel}>
          <div style={css.topo}>
            <div>
              <p style={{ color: '#60a5fa', fontWeight: 800, margin: 0 }}>PLATAFORMA</p>
              <h2 style={{ margin: '4px 0' }}>{titulo}</h2>
            </div>

            {pagina === 'empresas' && (
              <button style={css.primario} type="button" onClick={() => setMostrarEmpresa((v) => !v)}>
                + Nova empresa
              </button>
            )}

            {pagina === 'equipe' && usuario.perfil === 'superadmin' && (
              <button style={css.primario} type="button" onClick={() => setMostrarFuncionario((v) => !v)}>
                + Novo funcionário
              </button>
            )}
          </div>

          {pagina === 'empresas' && mostrarEmpresa && (
            <form onSubmit={cadastrarEmpresa} style={{ ...css.grid, marginBottom: '22px' }}>
              <label>Empresa *<input style={css.input} value={novaEmpresa.nome} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nome: e.target.value })} /></label>
              <label>Nome fantasia<input style={css.input} value={novaEmpresa.nomeFantasia} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, nomeFantasia: e.target.value })} /></label>
              <label>CNPJ<input style={css.input} value={novaEmpresa.cnpj} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, cnpj: e.target.value })} /></label>
              <label>Telefone<input style={css.input} value={novaEmpresa.telefone} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, telefone: e.target.value })} /></label>
              <label>E-mail da empresa<input style={css.input} type="email" value={novaEmpresa.email} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, email: e.target.value })} /></label>
              <label>Administrador *<input style={css.input} value={novaEmpresa.adminNome} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminNome: e.target.value })} /></label>
              <label>E-mail do administrador *<input style={css.input} type="email" value={novaEmpresa.adminEmail} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminEmail: e.target.value })} /></label>
              <label>Senha inicial *<input style={css.input} type="password" minLength="6" value={novaEmpresa.adminSenha} onChange={(e) => setNovaEmpresa({ ...novaEmpresa, adminSenha: e.target.value })} /></label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                <button style={css.primario} type="submit">Cadastrar empresa</button>
                <button style={css.botao} type="button" onClick={() => setMostrarEmpresa(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {pagina === 'equipe' && mostrarFuncionario && (
            <form onSubmit={cadastrarFuncionario} style={{ ...css.grid, marginBottom: '22px' }}>
              <label>Nome *<input style={css.input} value={novoFuncionario.nome} onChange={(e) => setNovoFuncionario({ ...novoFuncionario, nome: e.target.value })} /></label>
              <label>E-mail *<input style={css.input} type="email" value={novoFuncionario.email} onChange={(e) => setNovoFuncionario({ ...novoFuncionario, email: e.target.value })} /></label>
              <label>Senha inicial *<input style={css.input} type="password" minLength="6" value={novoFuncionario.senha} onChange={(e) => setNovoFuncionario({ ...novoFuncionario, senha: e.target.value })} /></label>
              <label>
                Perfil *
                <select style={css.input} value={novoFuncionario.perfil} onChange={(e) => setNovoFuncionario({ ...novoFuncionario, perfil: e.target.value })}>
                  <option value="administrativo">Administrativo</option>
                  <option value="comercial">Comercial</option>
                  <option value="suporte">Suporte</option>
                  <option value="tecnico">Técnico</option>
                </select>
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                <button style={css.primario} type="submit">Cadastrar funcionário</button>
                <button style={css.botao} type="button" onClick={() => setMostrarFuncionario(false)}>Cancelar</button>
              </div>
            </form>
          )}

          {carregando ? (
            <p style={css.mutado}>Carregando...</p>
          ) : pagina === 'empresas' ? (
            <div style={css.tabelaWrap}>
              <table style={css.tabela}>
                <thead>
                  <tr>
                    {['Empresa', 'CNPJ', 'Contato', 'Usuários', 'Status', 'Ações'].map((h) => <th key={h} style={css.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {empresas.length === 0 ? (
                    <tr><td style={css.td} colSpan="6">Nenhuma empresa cadastrada.</td></tr>
                  ) : empresas.map((empresa) => (
                    <tr key={empresa.id}>
                      <td style={css.td}><strong>{empresa.nome_fantasia || empresa.nome}</strong><br /><small>{empresa.nome}</small></td>
                      <td style={css.td}>{empresa.cnpj || '-'}</td>
                      <td style={css.td}>{empresa.telefone || empresa.email || '-'}</td>
                      <td style={css.td}>{empresa.quantidade_usuarios}</td>
                      <td style={css.td}>{empresa.ativa === false ? 'Inativa' : 'Ativa'}</td>
                      <td style={css.td}>
                        <button style={empresa.ativa === false ? css.botao : css.perigo} type="button" onClick={() => alterarEmpresa(empresa)}>
                          {empresa.ativa === false ? 'Ativar' : 'Inativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : pagina === 'equipe' ? (
            <div style={css.tabelaWrap}>
              <table style={css.tabela}>
                <thead>
                  <tr>
                    {['Nome', 'E-mail', 'Perfil', 'Status', 'Ações'].map((h) => <th key={h} style={css.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {equipe.map((funcionario) => (
                    <tr key={funcionario.id}>
                      <td style={css.td}><strong>{funcionario.nome}</strong></td>
                      <td style={css.td}>{funcionario.email}</td>
                      <td style={css.td}>{funcionario.perfil}</td>
                      <td style={css.td}>{funcionario.ativo === false ? 'Inativo' : 'Ativo'}</td>
                      <td style={css.td}>
                        {funcionario.id === usuario.id ? 'Seu acesso' : (
                          <button style={funcionario.ativo === false ? css.botao : css.perigo} type="button" onClick={() => alterarFuncionario(funcionario)}>
                            {funcionario.ativo === false ? 'Ativar' : 'Inativar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={css.tabelaWrap}>
              <table style={css.tabela}>
                <thead>
                  <tr>
                    {['Data', 'Usuário', 'Ação', 'Empresa', 'Detalhes'].map((h) => <th key={h} style={css.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {auditoria.length === 0 ? (
                    <tr><td style={css.td} colSpan="5">Nenhuma ação registrada ainda.</td></tr>
                  ) : auditoria.map((item) => (
                    <tr key={item.id}>
                      <td style={css.td}>{new Date(item.criado_em).toLocaleString('pt-BR')}</td>
                      <td style={css.td}>{item.usuario_nome || '-'}</td>
                      <td style={css.td}>{item.acao}</td>
                      <td style={css.td}>{item.empresa_id || '-'}</td>
                      <td style={css.td}>{item.detalhes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default PlataformaAdmin
