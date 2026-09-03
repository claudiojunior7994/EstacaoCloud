const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

// USUÁRIO TEMPORÁRIO APENAS PARA TESTE.
// Quando conectarmos o PostgreSQL, ele será removido
// e cada empresa terá seus próprios usuários.
const usuarioTeste = {
  id: 1,
  empresaId: 1,
  nome: 'Administrador',
  email: 'admin@estacaocloud.local',
  perfil: 'admin',
};

router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        erro: 'E-mail e senha são obrigatórios.',
      });
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    if (emailNormalizado !== usuarioTeste.email) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.',
      });
    }

    // Senha temporária somente para teste local.
    const senhaHashTemporaria = await bcrypt.hash('123456', 10);

    const senhaValida = await bcrypt.compare(
      String(senha),
      senhaHashTemporaria
    );

    if (!senhaValida) {
      return res.status(401).json({
        erro: 'E-mail ou senha inválidos.',
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET não configurado.');

      return res.status(500).json({
        erro: 'Configuração de autenticação ausente.',
      });
    }

    const token = jwt.sign(
      {
        sub: usuarioTeste.id,
        empresaId: usuarioTeste.empresaId,
        perfil: usuarioTeste.perfil,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      }
    );

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso.',
      usuario: {
        id: usuarioTeste.id,
        empresaId: usuarioTeste.empresaId,
        nome: usuarioTeste.nome,
        email: usuarioTeste.email,
        perfil: usuarioTeste.perfil,
      },
      token,
    });
  } catch (erro) {
    console.error('Erro no login:', erro);

    return res.status(500).json({
      erro: 'Erro interno no login.',
    });
  }
});

module.exports = router;