import { useState } from 'react'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  async function fazerLogin(evento) {
    evento.preventDefault()

    setErro('')

    try {
      const resposta = await fetch(
        'http://localhost:3000/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.trim(),
            senha,
          }),
        },
      )

      const dados = await resposta.json()

      if (!resposta.ok) {
        setErro(
          dados.erro || 'Não foi possível entrar.',
        )
        return
      }

      localStorage.setItem(
        'estacaocloud-token',
        dados.token,
      )

      localStorage.setItem(
        'estacaocloud-usuario',
        JSON.stringify(dados.usuario),
      )

      onLogin(dados.usuario, dados.token)
    } catch (erroLogin) {
      console.error(
        'Erro ao realizar login:',
        erroLogin,
      )

      setErro(
        'Não foi possível conectar ao servidor.',
      )
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">E</div>

          <div>
            <h1>EstaçãoCloud</h1>
            <p>
              Gestão inteligente para o varejo
            </p>
          </div>
        </div>

        <div className="login-header">
          <p className="eyebrow">
            ACESSO AO SISTEMA
          </p>

          <h2>Entrar</h2>

          <p>
            Informe suas credenciais para acessar sua empresa.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={fazerLogin}
        >
          <div className="form-group">
            <label htmlFor="loginEmail">
              E-mail
            </label>

            <input
              id="loginEmail"
              type="email"
              autoComplete="username"
              placeholder="seu@email.com"
              value={email}
              onChange={(evento) =>
                setEmail(evento.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="loginSenha">
              Senha
            </label>

            <input
              id="loginSenha"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(evento) =>
                setSenha(evento.target.value)
              }
              required
            />
          </div>

          {erro && (
            <div
              className="login-error"
              role="alert"
            >
              {erro}
            </div>
          )}

          <button
            type="submit"
            className="primary-button login-button"
          >
            Entrar
          </button>
        </form>

        <div className="login-security">
          🔒 Acesso protegido pelo EstaçãoCloud
        </div>
      </div>
    </div>
  )
}

export default Login