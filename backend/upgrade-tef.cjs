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
    console.log('🚂 EstacaoCloud - Upgrade TEF')
    console.log('Preparando estrutura multiadquirente...')

    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE empresas
      ADD COLUMN IF NOT EXISTS tef_habilitado BOOLEAN
        NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS tef_modo VARCHAR(20)
        NOT NULL DEFAULT 'simulacao',
      ADD COLUMN IF NOT EXISTS tef_provedor VARCHAR(60);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS tef_terminais (
        id SERIAL PRIMARY KEY,
        empresa_id INTEGER NOT NULL
          REFERENCES empresas(id) ON DELETE CASCADE,

        terminal VARCHAR(30) NOT NULL,
        identificador_tef VARCHAR(100),
        ativo BOOLEAN NOT NULL DEFAULT TRUE,

        criada_em TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP,
        atualizada_em TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        UNIQUE (empresa_id, terminal)
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS tef_transacoes (
        id SERIAL PRIMARY KEY,

        empresa_id INTEGER NOT NULL
          REFERENCES empresas(id) ON DELETE CASCADE,

        venda_id INTEGER
          REFERENCES vendas(id) ON DELETE SET NULL,

        terminal VARCHAR(30) NOT NULL,

        tipo VARCHAR(20) NOT NULL,
        valor NUMERIC(12,2) NOT NULL,

        provedor VARCHAR(60),
        modo VARCHAR(20) NOT NULL DEFAULT 'simulacao',

        status VARCHAR(20) NOT NULL DEFAULT 'iniciada',

        nsu VARCHAR(100),
        autorizacao VARCHAR(100),
        identificador_externo VARCHAR(150),

        mensagem TEXT,

        criada_em TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP,
        atualizada_em TIMESTAMP NOT NULL
          DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT chk_tef_tipo
          CHECK (tipo IN ('debito', 'credito')),

        CONSTRAINT chk_tef_status
          CHECK (
            status IN (
              'iniciada',
              'aprovada',
              'negada',
              'cancelada',
              'erro'
            )
          ),

        CONSTRAINT chk_tef_valor
          CHECK (valor > 0)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_tef_transacoes_empresa
      ON tef_transacoes (empresa_id);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
        idx_tef_transacoes_venda
      ON tef_transacoes (venda_id);
    `)

    await client.query('COMMIT')

    console.log('OK: estrutura TEF criada com sucesso.')
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error('ERRO no upgrade TEF:', erro)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
