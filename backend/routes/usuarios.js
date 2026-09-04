const express = require('express');

const autenticar = require('../middleware/auth');
const permitirPerfis = require('../middleware/permissao');

const router = express.Router();

// Lista os usuários da empresa logada.
// Depois os dados virão do PostgreSQL.
router.get(
  '/',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  (req, res) => {
    return res.status(200).json({
      empresaId: req.usuario.empresaId,
      usuarios: [],
    });
  }
);

// Criação de usuários.
// Somente administrador poderá criar novos acessos.
router.post(
  '/',
  autenticar,
  permitirPerfis('admin'),
  (req, res) => {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil) {
      return res.status(400).json({
        erro: 'Nome, e-mail, senha e perfil são obrigatórios.',
      });
    }

    const perfisPermitidos = [
      'admin',
      'gerente',
      'operador',
    ];

    if (!perfisPermitidos.includes(perfil)) {
      return res.status(400).json({
        erro: 'Perfil de usuário inválido.',
      });
    }

    // Nunca retornamos a senha na resposta.
    // Depois ela será convertida em hash com bcrypt
    // antes de ser salva no PostgreSQL.
    return res.status(201).json({
      mensagem: 'Usuário validado com sucesso.',
      usuario: {
        empresaId: req.usuario.empresaId,
        nome: String(nome).trim(),
        email: String(email).trim().toLowerCase(),
        perfil,
        ativo: true,
      },
    });
  }
);

module.exports = router;