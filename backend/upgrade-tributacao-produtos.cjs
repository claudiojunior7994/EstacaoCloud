require('dotenv').config()

const { pool } = require('./database/db')

async function executar() {
  try {
    await pool.query(`
      ALTER TABLE produtos
        ADD COLUMN IF NOT EXISTS cst_pis VARCHAR(2),
        ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS cst_cofins VARCHAR(2),
        ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_icms NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_ibs_uf NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_ibs_municipal NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(10,4);

      ALTER TABLE venda_itens
        ADD COLUMN IF NOT EXISTS cst_pis VARCHAR(2),
        ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS cst_cofins VARCHAR(2),
        ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_icms NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_ibs_uf NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_ibs_municipal NUMERIC(10,4),
        ADD COLUMN IF NOT EXISTS aliquota_cbs NUMERIC(10,4);
    `)

    console.log(
      'Estrutura tributária complementar criada com sucesso.'
    )
  } catch (erro) {
    console.error(
      'Erro ao criar estrutura tributária:',
      erro,
    )
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

executar()
