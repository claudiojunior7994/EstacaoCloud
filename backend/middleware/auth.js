const jwt = require('jsonwebtoken')

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'estacaocloud-dev-secret-alterar-em-producao'

function autenticar(req, res, next) {
  try {
    const authorization = req.headers.authorization || ''

    if (!authorization.startsWith('Bearer ')) {
      return res.status(401).json({
        erro: 'Token não informado ou inválido.',
      })
    }

    const token = authorization.substring(7).trim()

    if (!token) {
      return res.status(401).json({
        erro: 'Token não informado.',
      })
    }

    const payload = jwt.verify(token, JWT_SECRET)

    if (payload.tipo && payload.tipo !== 'cliente') {
      return res.status(403).json({
        erro: 'Token não autorizado para o EstaçãoCloud.',
      })
    }

    if (!payload.sub || !payload.empresaId || !payload.perfil) {
      return res.status(401).json({
        erro: 'Token inválido.',
      })
    }

    req.usuario = {
      id: Number(payload.sub),
      empresaId: Number(payload.empresaId),
      perfil: payload.perfil,
    }

    return next()
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Token expirado.',
      })
    }

    if (erro.name === 'JsonWebTokenError') {
      return res.status(401).json({
        erro: 'Token inválido.',
      })
    }

    console.error('Erro na autenticação:', erro)

    return res.status(500).json({
      erro: 'Erro interno de autenticação.',
    })
  }
}

module.exports = autenticar