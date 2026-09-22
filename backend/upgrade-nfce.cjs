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
    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE vendas
      ADD COLUMN IF NOT EXISTS documento_consumidor VARCHAR(14);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS nfce (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL REFERENCES empresas(id),
        venda_id INTEGER NOT NULL REFERENCES vendas(id),

        ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
        serie INTEGER NOT NULL,
        numero INTEGER NOT NULL,

        status VARCHAR(30) NOT NULL DEFAULT 'pendente',

        chave_acesso VARCHAR(44),
        protocolo VARCHAR(30),

        documento_consumidor VARCHAR(14),

        xml_envio TEXT,
        xml_autorizado TEXT,

        motivo_rejeicao TEXT,

        qr_code_url TEXT,

        criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        autorizada_em TIMESTAMP,

        UNIQUE (empresa_id, serie, numero),
        UNIQUE (venda_id)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nfce_empresa
      ON nfce (empresa_id);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nfce_venda
      ON nfce (venda_id);
    `)

    await client.query('COMMIT')

    console.log('')
    console.log('======================================')
    console.log(' Estrutura NFC-e criada com sucesso.')
    console.log('======================================')
    console.log('')
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error('Erro ao criar estrutura NFC-e:', erro)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
