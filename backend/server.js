require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')

const authRoutes = require('./routes/auth')
const empresasRoutes = require('./routes/empresas')
const usuariosRoutes = require('./routes/usuarios')
const produtosRoutes = require('./routes/produtos')
const fornecedoresRoutes = require('./routes/fornecedores')
const clientesRoutes = require('./routes/clientes')
const vendasRoutes = require('./routes/vendas')

const autenticar = require('./middleware/auth')
const permitirPerfis = require('./middleware/permissao')

const { testarConexao } = require('./database/db')

const app = express()

const PORT = Number(process.env.PORT) || 3000
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || 'http://localhost:5173'

app.disable('x-powered-by')

app.use(helmet())

app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

app.use(express.json({ limit: '100kb' }))

app.get('/', (req, res) => {
  res.json({
    sistema: 'EstacaoCloud',
    api: 'online',
  })
})

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/empresas', empresasRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/produtos', produtosRoutes)
app.use('/api/fornecedores', fornecedoresRoutes)
app.use('/api/clientes', clientesRoutes)
app.use('/api/vendas', vendasRoutes)

app.get('/api/me', autenticar, (req, res) => {
  res.status(200).json({
    mensagem: 'Acesso autorizado.',
    usuario: req.usuario,
  })
})

app.get(
  '/api/admin/teste',
  autenticar,
  permitirPerfis('admin'),
  (req, res) => {
    res.status(200).json({
      mensagem: 'Acesso de administrador autorizado.',
      usuario: req.usuario,
    })
  },
)

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada.',
  })
})

app.use((err, req, res, next) => {
  console.error('Erro interno:', err)

  res.status(500).json({
    erro: 'Erro interno do servidor.',
  })
})

async function iniciarServidor() {
  await testarConexao()

  app.listen(PORT, () => {
    console.log('')
    console.log('================================')
    console.log(' EstacaoCloud API')
    console.log(` Porta: ${PORT}`)
    console.log(' Security: ativa')
    console.log(' Auth: ativa')
    console.log(' Permissoes: ativas')
    console.log(' Multiempresa: ativa')
    console.log(' Produtos API: ativa')
    console.log(' Fornecedores API: ativa')
    console.log(' Clientes API: ativa')
    console.log(' Vendas API: ativa')
    console.log('================================')
    console.log('')
  })
}

iniciarServidor()