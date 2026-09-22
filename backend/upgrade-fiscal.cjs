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
    console.log('🚂 EstacaoCloud - Upgrade Fiscal')
    console.log('Preparando estrutura fiscal da empresa...')

    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE empresas
      ADD COLUMN IF NOT EXISTS regime_tributario VARCHAR(30),
      ADD COLUMN IF NOT EXISTS codigo_municipio_ibge VARCHAR(10),
      ADD COLUMN IF NOT EXISTS nfce_ambiente VARCHAR(20)
        NOT NULL DEFAULT 'homologacao',
      ADD COLUMN IF NOT EXISTS nfce_serie INTEGER
        NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS nfce_proximo_numero INTEGER
        NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS nfce_csc_id VARCHAR(20),
      ADD COLUMN IF NOT EXISTS nfce_csc TEXT,
      ADD COLUMN IF NOT EXISTS nfce_habilitada BOOLEAN
        NOT NULL DEFAULT FALSE;
    `)

    await client.query('COMMIT')

    console.log('✅ Estrutura fiscal criada com sucesso.')
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error('❌ Erro no upgrade fiscal:', erro)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
