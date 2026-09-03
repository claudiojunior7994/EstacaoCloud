const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        erro: 'Token não informado.',
      });
    }

    const partes = authorization.split(' ');

    if (partes.length !== 2 || partes[0] !== 'Bearer') {
      return res.status(401).json({
        erro: 'Token inválido.',
      });
    }

    const token = partes[1];

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não configurado.');

      return res.status(500).json({
        erro: 'Configuração de autenticação ausente.',
      });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.usuario = {
      id: payload.sub,
      empresaId: payload.empresaId,
      perfil: payload.perfil,
    };

    return next();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({
        erro: 'Token expirado.',
      });
    }

    if (erro.name === 'JsonWebTokenError') {
      return res.status(401).json({
        erro: 'Token inválido.',
      });
    }

    console.error('Erro na autenticação:', erro);

    return res.status(500).json({
      erro: 'Erro interno de autenticação.',
    });
  }
}

module.exports = autenticar;