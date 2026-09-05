import { useState } from 'react'
import './Login.css'

const API_URL = 'http://localhost:3000'

function CardAcesso({
  ambiente,
  icone,
  etiqueta,
  titulo,
  descricao,
  rodape,
  formulario,
  erro,
  carregando,
  onAlterarCampo,
  onAutenticar,
}) {
  return (
    <section className={`ec-login-card ec-login-card-${ambiente}`}>
      <div className="ec-login-card-header">
        <div className="ec-login-card-icon">{icone}</div>

        <div>
          <span>{etiqueta}</span>
          <h3>{titulo}</h3>
        </div>
      </div>

      <p className="ec-login-descricao">{descricao}</p>

      <form onSubmit={(evento) => onAutenticar(evento, ambiente)}>
        <label>
          <span>
            {ambiente === 'pdv' ? 'Login do operador' : 'E-mail'}
          </span>

          <input
            type="email"
            autoComplete="username"
            placeholder={
              ambiente === 'gestao'
                ? 'gestor@empresa.com'
                : ambiente === 'estoque'
                  ? 'estoque@empresa.com'
                  : 'operador@empresa.com'
            }
            value={formulario.email}
            onChange={(evento) =>
              onAlterarCampo(ambiente, 'email', evento.target.value)
            }
            required
          />
        </label>

        <label>
          <span>Senha</span>

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            value={formulario.senha}
            onChange={(evento) =>
              onAlterarCampo(ambiente, 'senha', evento.target.value)
            }
            required
          />
        </label>

        {erro && <div className="ec-login-erro">{erro}</div>}

        <button
          type="submit"
          className={`ec-login-botao ec-login-botao-${ambiente}`}
          disabled={carregando}
        >
          {carregando
            ? 'Entrando...'
            : ambiente === 'gestao'
              ? 'Entrar na Gestão'
              : ambiente === 'estoque'
                ? 'Entrar no Estoque'
                : 'Entrar no PDV'}
        </button>
      </form>

      <small>{rodape}</small>
    </section>
  )
}

function Login({ onLogin }) {
  const [formularios, setFormularios] = useState({
    gestao: { email: '', senha: '' },
    estoque: { email: '', senha: '' },
    pdv: { email: '', senha: '' },
  })

  const [erros, setErros] = useState({
    gestao: '',
    estoque: '',
    pdv: '',
  })

  const [carregando, setCarregando] = useState('')

  function alterarCampo(ambiente, campo, valor) {
    setFormularios((atual) => ({
      ...atual,
      [ambiente]: {
        ...atual[ambiente],
        [campo]: valor,
      },
    }))
  }

  async function autenticar(evento, ambiente) {
    evento.preventDefault()

    const dadosFormulario = formularios[ambiente]

    setErros((atual) => ({
      ...atual,
      [ambiente]: '',
    }))

    setCarregando(ambiente)

    try {
      const resposta = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: dadosFormulario.email.trim(),
          senha: dadosFormulario.senha,
        }),
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErros((atual) => ({
          ...atual,
          [ambiente]: dados.erro || 'Não foi possível entrar.',
        }))
        return
      }

      const perfil = String(
        dados.usuario?.perfil ||
          dados.usuario?.tipo ||
          dados.usuario?.role ||
          '',
      ).toLowerCase()

      if (ambiente === 'gestao') {
        const permitido =
          !perfil ||
          perfil.includes('admin') ||
          perfil.includes('gerente') ||
          perfil.includes('gestor')

        if (!permitido) {
          setErros((atual) => ({
            ...atual,
            gestao: 'Este usuário não possui acesso ao módulo de Gestão.',
          }))
          return
        }
      }

      if (ambiente === 'estoque') {
        const permitido =
          !perfil ||
          perfil.includes('admin') ||
          perfil.includes('gerente') ||
          perfil.includes('gestor') ||
          perfil.includes('estoque') ||
          perfil.includes('estoquista') ||
          perfil.includes('operacional')

        if (!permitido) {
          setErros((atual) => ({
            ...atual,
            estoque:
              'Este usuário não possui acesso ao módulo de Estoque.',
          }))
          return
        }
      }

      localStorage.setItem('estacaocloud-token', dados.token)
      localStorage.setItem(
        'estacaocloud-usuario',
        JSON.stringify(dados.usuario),
      )
      localStorage.setItem('estacaocloud-ambiente', ambiente)

      onLogin(dados.usuario, dados.token, ambiente)
    } catch (erroLogin) {
      console.error('Erro ao realizar login:', erroLogin)

      setErros((atual) => ({
        ...atual,
        [ambiente]: 'Não foi possível conectar ao servidor.',
      }))
    } finally {
      setCarregando('')
    }
  }

  return (
    <div className="ec-login-page">
      <div className="ec-login-shell">
        <header className="ec-login-topo">
          <div className="ec-login-logo">E</div>

          <div>
            <h1>EstaçãoCloud</h1>
            <p>Gestão, operação e frente de caixa em um único sistema</p>
          </div>
        </header>

        <div className="ec-login-titulo">
          <span>ACESSO AO SISTEMA</span>
          <h2>Escolha seu ambiente</h2>
          <p>
            Cada colaborador acessa apenas as ferramentas necessárias para
            sua função.
          </p>
        </div>

        <div className="ec-login-grid">
          <CardAcesso
            ambiente="gestao"
            icone="▦"
            etiqueta="ADMINISTRATIVO"
            titulo="Gestão"
            descricao="Administração geral, vendas, clientes, relatórios, usuários, permissões e configurações."
            rodape="Perfil permitido: gerente / administrador"
            formulario={formularios.gestao}
            erro={erros.gestao}
            carregando={carregando === 'gestao'}
            onAlterarCampo={alterarCampo}
            onAutenticar={autenticar}
          />

          <CardAcesso
            ambiente="estoque"
            icone="📦"
            etiqueta="OPERACIONAL"
            titulo="Estoque / Cadastro"
            descricao="Cadastro de produtos, consulta de estoque, recebimento e relacionamento com fornecedores."
            rodape="Perfil permitido: estoque / operacional"
            formulario={formularios.estoque}
            erro={erros.estoque}
            carregando={carregando === 'estoque'}
            onAlterarCampo={alterarCampo}
            onAutenticar={autenticar}
          />

          <CardAcesso
            ambiente="pdv"
            icone="🛒"
            etiqueta="FRENTE DE CAIXA"
            titulo="PDV / Caixa"
            descricao="Venda, consulta, quantidade, desconto, pagamentos e operações do caixa."
            rodape="Operadores são cadastrados pelo gerente na Gestão"
            formulario={formularios.pdv}
            erro={erros.pdv}
            carregando={carregando === 'pdv'}
            onAlterarCampo={alterarCampo}
            onAutenticar={autenticar}
          />
        </div>

        <footer className="ec-login-rodape">
          🔒 Acesso protegido pelo EstaçãoCloud
        </footer>
      </div>
    </div>
  )
}

export default Login
