const express = require('express');

const autenticar = require('../middleware/auth');
const permitirPerfis = require('../middleware/permissao');

const router = express.Router();

// Rota temporária.
// Depois buscará os dados reais da empresa no PostgreSQL.
router.get(
  '/minha-empresa',
  autenticar,
  (req, res) => {
    return res.status(200).json({
      empresa: {
        id: req.usuario.empresaId,
        nome: 'Empresa de teste',
        ativa: true,
      },
    });
  }
);

// Rota reservada para administradores.
// Depois será usada para editar os dados da empresa.
router.patch(
  '/minha-empresa',
  autenticar,
  permitirPerfis('admin'),
  (req, res) => {
    const {
      nome,
      nomeFantasia,
      cnpj,
      email,
      telefone,
    } = req.body;

    return res.status(200).json({
      mensagem: 'Dados da empresa validados com sucesso.',
      empresa: {
        id: req.usuario.empresaId,
        nome: nome || null,
        nomeFantasia: nomeFantasia || null,
        cnpj: cnpj || null,
        email: email || null,
        telefone: telefone || null,
      },
    });
  }
);

module.exports = router;