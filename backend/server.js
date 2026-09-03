require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || 'http://localhost:5173';

// Segurança básica
app.disable('x-powered-by');
app.use(helmet());

// CORS: permite somente o frontend autorizado
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Limita o tamanho dos dados recebidos pela API
app.use(express.json({ limit: '100kb' }));

// Rota principal
app.get('/', (req, res) => {
  res.json({
    sistema: 'EstacaoCloud',
    api: 'online',
  });
});

// Rota para verificar a saúde da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Rotas inexistentes
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada.',
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro interno:', err);

  res.status(500).json({
    erro: 'Erro interno do servidor.',
  });
});

app.listen(PORT, () => {
  console.log('');
  console.log('================================');
  console.log(' EstacaoCloud API');
  console.log(` Porta: ${PORT}`);
  console.log(' Security: ativa');
  console.log('================================');
  console.log('');
});