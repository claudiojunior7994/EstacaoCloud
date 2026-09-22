require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
})

async function executar() {
  const client = await pool.connect()

  try {
    console.log('🚂 EstacaoCloud - Upgrade Pagamento Misto')
    console.log('Atualizando estrutura de pagamentos...')

    await client.query('BEGIN')

    // Permite identificar uma venda como pagamento misto
    await client.query(`
      ALTER TABLE vendas
      DROP CONSTRAINT IF EXISTS chk_venda_pagamento;
    `)

    await client.query(`
      ALTER TABLE vendas
      ADD CONSTRAINT chk_venda_pagamento
      CHECK (
        forma_pagamento IN (
          'Pix',
          'Dinheiro',
          'Cartão de débito',
          'Cartão de crédito',
          'Pagamento Misto'
        )
      );
    `)

    // Guarda a composição financeira de cada venda
    await client.query(`
      CREATE TABLE IF NOT EXISTS venda_pagamentos (
        id SERIAL PRIMARY KEY,

        venda_id INTEGER NOT NULL
          REFERENCES vendas(id)
          ON DELETE CASCADE,

        forma_pagamento VARCHAR(40) NOT NULL,

        valor NUMERIC(12,2) NOT NULL,

        criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT chk_venda_pagamentos_forma
          CHECK (
            forma_pagamento IN (
              'Pix',
              'Dinheiro',
              'Cartão de débito',
              'Cartão de crédito'
            )
          ),

        CONSTRAINT chk_venda_pagamentos_valor
          CHECK (valor > 0)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_venda_pagamentos_venda
      ON venda_pagamentos (venda_id);
    `)

    await client.query('COMMIT')

    console.log('OK: estrutura de Pagamento Misto criada com sucesso.')
  } catch (erro) {
    await client.query('ROLLBACK')

    console.error('ERRO ao atualizar banco:')
    console.error(erro)

    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
