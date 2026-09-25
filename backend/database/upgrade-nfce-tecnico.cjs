require('dotenv').config()

const { pool } = require('./db')

async function executar() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE nfce
      ADD COLUMN IF NOT EXISTS
        codigo_numerico VARCHAR(8)
    `)

    await client.query(`
      ALTER TABLE nfce
      ADD COLUMN IF NOT EXISTS
        digito_verificador INTEGER
    `)

    await client.query(`
      ALTER TABLE nfce
      ADD COLUMN IF NOT EXISTS
        codigo_status_sefaz VARCHAR(10)
    `)

    await client.query(`
      ALTER TABLE nfce
      ADD COLUMN IF NOT EXISTS
        mensagem_status_sefaz TEXT
    `)

    await client.query(`
      ALTER TABLE nfce
      ADD COLUMN IF NOT EXISTS
        atualizada_em TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
    `)

    await client.query(`
      ALTER TABLE nfce
      ADD COLUMN IF NOT EXISTS
        ultima_tentativa_em TIMESTAMP
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_nfce_chave_acesso
      ON nfce(chave_acesso)
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_nfce_status
      ON nfce(empresa_id, status)
    `)

    await client.query('COMMIT')

    console.log('')
    console.log('====================================')
    console.log(' Upgrade técnico NFC-e concluído')
    console.log('====================================')
    console.log('')
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error(
      'Erro no upgrade técnico NFC-e:',
      erro,
    )
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
