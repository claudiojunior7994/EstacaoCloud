require('dotenv').config()

const { pool } = require('./database/db')

async function executar() {
  try {
    await pool.query(`
      ALTER TABLE empresas
        ADD COLUMN IF NOT EXISTS logradouro VARCHAR(150),
        ADD COLUMN IF NOT EXISTS numero_endereco VARCHAR(20),
        ADD COLUMN IF NOT EXISTS complemento VARCHAR(100),
        ADD COLUMN IF NOT EXISTS bairro VARCHAR(100);
    `)

    console.log(
      'Estrutura de endereço fiscal criada com sucesso.'
    )
  } catch (erro) {
    console.error(
      'Erro ao criar endereço fiscal:',
      erro,
    )
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

executar()
