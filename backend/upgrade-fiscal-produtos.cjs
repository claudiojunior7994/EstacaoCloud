require('dotenv').config()

const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : undefined,
})

async function executar() {
  const client = await pool.connect()

  try {
    console.log('🚂 EstacaoCloud - Upgrade Fiscal dos Produtos')
    console.log('Preparando classificacao fiscal...')

    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE produtos
      ADD COLUMN IF NOT EXISTS ncm VARCHAR(8),
      ADD COLUMN IF NOT EXISTS cest VARCHAR(7),
      ADD COLUMN IF NOT EXISTS origem_mercadoria VARCHAR(2),
      ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3),
      ADD COLUMN IF NOT EXISTS csosn VARCHAR(4),
      ADD COLUMN IF NOT EXISTS cfop VARCHAR(4),
      ADD COLUMN IF NOT EXISTS cst_ibs_cbs VARCHAR(3),
      ADD COLUMN IF NOT EXISTS cclass_trib VARCHAR(10);
    `)

    await client.query('COMMIT')

    console.log('✅ Campos fiscais dos produtos criados com sucesso.')
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error('❌ Erro no upgrade fiscal dos produtos:', erro)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
