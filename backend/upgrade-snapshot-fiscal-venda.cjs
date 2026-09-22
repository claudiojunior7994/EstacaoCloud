require('dotenv').config()
const { pool } = require('./database/db')

async function executar() {
  try {
    await pool.query(`
      ALTER TABLE venda_itens
        ADD COLUMN IF NOT EXISTS codigo_barras VARCHAR(50),
        ADD COLUMN IF NOT EXISTS ncm VARCHAR(8),
        ADD COLUMN IF NOT EXISTS cest VARCHAR(7),
        ADD COLUMN IF NOT EXISTS origem_mercadoria VARCHAR(2),
        ADD COLUMN IF NOT EXISTS cst_icms VARCHAR(3),
        ADD COLUMN IF NOT EXISTS csosn VARCHAR(4),
        ADD COLUMN IF NOT EXISTS cfop VARCHAR(4),
        ADD COLUMN IF NOT EXISTS cst_ibs_cbs VARCHAR(3),
        ADD COLUMN IF NOT EXISTS cclass_trib VARCHAR(10);
    `)

    console.log('Snapshot fiscal dos itens da venda criado com sucesso.')
  } catch (erro) {
    console.error('Erro ao criar snapshot fiscal:', erro)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

executar()
