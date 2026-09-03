const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn(
    'DATABASE_URL ainda não configurada. O PostgreSQL ficará desconectado por enquanto.'
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  ssl:
    process.env.NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

async function testarConexao() {
  if (!process.env.DATABASE_URL) {
    return false;
  }

  try {
    const cliente = await pool.connect();

    await cliente.query('SELECT NOW()');

    cliente.release();

    console.log('PostgreSQL conectado com sucesso.');

    return true;
  } catch (erro) {
    console.error('Erro ao conectar no PostgreSQL:', erro.message);

    return false;
  }
}

module.exports = {
  pool,
  testarConexao,
};