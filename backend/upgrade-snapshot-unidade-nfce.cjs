require('dotenv').config()

const { pool } = require('./database/db')

async function executar() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(`
      ALTER TABLE venda_itens
      ADD COLUMN IF NOT EXISTS
        unidade VARCHAR(10)
    `)

    /*
     * Para vendas antigas tentamos recuperar a unidade
     * atual do produto.
     */
    await client.query(`
      UPDATE venda_itens vi
      SET unidade = p.unidade
      FROM produtos p
      WHERE vi.produto_id = p.id
        AND (
          vi.unidade IS NULL
          OR TRIM(vi.unidade) = ''
        )
    `)

    /*
     * Último fallback somente para histórico legado.
     * Vendas novas sempre gravarão snapshot real.
     */
    await client.query(`
      UPDATE venda_itens
      SET unidade = 'UN'
      WHERE unidade IS NULL
         OR TRIM(unidade) = ''
    `)

    await client.query(`
      ALTER TABLE venda_itens
      ALTER COLUMN unidade
      SET DEFAULT 'UN'
    `)

    await client.query(`
      ALTER TABLE venda_itens
      ALTER COLUMN unidade
      SET NOT NULL
    `)

    await client.query('COMMIT')

    console.log(
      '✓ Snapshot de unidade fiscal preparado.',
    )
  } catch (erro) {
    await client.query('ROLLBACK')
    console.error(erro)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
