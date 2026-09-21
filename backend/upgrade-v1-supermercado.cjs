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
    console.log('🚂 EstacaoCloud - Upgrade V1 Supermercado')
    console.log('Iniciando atualização do banco...')

    await client.query('BEGIN')

    // =====================================================
    // PRODUTOS - SUPERMERCADO / BALANÇA
    // =====================================================

    await client.query(`
      ALTER TABLE produtos
        ADD COLUMN IF NOT EXISTS unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
        ADD COLUMN IF NOT EXISTS pesavel BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS plu VARCHAR(20),
        ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER,
        ADD COLUMN IF NOT EXISTS etiqueta_ativa BOOLEAN NOT NULL DEFAULT TRUE;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_produto_unidade'
        ) THEN
          ALTER TABLE produtos
          ADD CONSTRAINT chk_produto_unidade
          CHECK (
            unidade IN (
              'UN','KG','G','L','ML',
              'CX','PC','PCT','DZ'
            )
          );
        END IF;
      END $$;
    `)

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_produto_fornecedor'
        ) THEN
          ALTER TABLE produtos
          ADD CONSTRAINT fk_produto_fornecedor
          FOREIGN KEY (fornecedor_id)
          REFERENCES fornecedores(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `)

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS
      uq_produto_empresa_plu
      ON produtos (empresa_id, plu)
      WHERE plu IS NOT NULL AND plu <> '';
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_produtos_fornecedor_id
      ON produtos (empresa_id, fornecedor_id);
    `)

    // =====================================================
    // MOVIMENTAÇÕES DE ESTOQUE
    // =====================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id SERIAL PRIMARY KEY,

        empresa_id INTEGER NOT NULL
          REFERENCES empresas(id)
          ON DELETE CASCADE,

        produto_id INTEGER NOT NULL
          REFERENCES produtos(id)
          ON DELETE CASCADE,

        usuario_id INTEGER
          REFERENCES usuarios(id)
          ON DELETE SET NULL,

        tipo VARCHAR(30) NOT NULL,

        quantidade NUMERIC(14,3) NOT NULL,

        estoque_anterior NUMERIC(14,3) NOT NULL,
        estoque_posterior NUMERIC(14,3) NOT NULL,

        referencia VARCHAR(100),
        observacao VARCHAR(255),

        criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT chk_movimentacao_estoque_tipo
          CHECK (
            tipo IN (
              'entrada',
              'saida',
              'venda',
              'cancelamento_venda',
              'inventario',
              'ajuste',
              'perda'
            )
          ),

        CONSTRAINT chk_movimentacao_quantidade
          CHECK (quantidade > 0)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_movimentacoes_estoque_empresa
      ON movimentacoes_estoque (empresa_id);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_movimentacoes_estoque_produto
      ON movimentacoes_estoque (empresa_id, produto_id);
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_movimentacoes_estoque_data
      ON movimentacoes_estoque (empresa_id, criado_em);
    `)

    // =====================================================
    // INVENTÁRIOS
    // =====================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventarios (
        id SERIAL PRIMARY KEY,

        empresa_id INTEGER NOT NULL
          REFERENCES empresas(id)
          ON DELETE CASCADE,

        usuario_id INTEGER
          REFERENCES usuarios(id)
          ON DELETE SET NULL,

        descricao VARCHAR(150),

        status VARCHAR(20) NOT NULL DEFAULT 'aberto',

        iniciado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finalizado_em TIMESTAMP,

        CONSTRAINT chk_inventario_status
          CHECK (status IN ('aberto', 'finalizado', 'cancelado'))
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_inventarios_empresa
      ON inventarios (empresa_id, iniciado_em);
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventario_itens (
        id SERIAL PRIMARY KEY,

        inventario_id INTEGER NOT NULL
          REFERENCES inventarios(id)
          ON DELETE CASCADE,

        produto_id INTEGER NOT NULL
          REFERENCES produtos(id)
          ON DELETE CASCADE,

        estoque_sistema NUMERIC(14,3) NOT NULL,
        estoque_contado NUMERIC(14,3),

        diferenca NUMERIC(14,3),

        contado_em TIMESTAMP,

        UNIQUE (inventario_id, produto_id)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_inventario_itens_inventario
      ON inventario_itens (inventario_id);
    `)

    // =====================================================
    // ETIQUETAS DE GÔNDOLA
    // =====================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS etiquetas_gondola (
        id SERIAL PRIMARY KEY,

        empresa_id INTEGER NOT NULL
          REFERENCES empresas(id)
          ON DELETE CASCADE,

        produto_id INTEGER NOT NULL
          REFERENCES produtos(id)
          ON DELETE CASCADE,

        usuario_id INTEGER
          REFERENCES usuarios(id)
          ON DELETE SET NULL,

        quantidade INTEGER NOT NULL DEFAULT 1,

        preco NUMERIC(12,2) NOT NULL,

        preco_clube NUMERIC(12,2),

        impressa BOOLEAN NOT NULL DEFAULT FALSE,

        criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        impressa_em TIMESTAMP,

        CONSTRAINT chk_etiqueta_quantidade
          CHECK (quantidade > 0)
      );
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS
      idx_etiquetas_empresa
      ON etiquetas_gondola (empresa_id, criada_em);
    `)

    // =====================================================
    // CONFIGURAÇÕES DA EMPRESA
    // =====================================================

    await client.query(`
      ALTER TABLE empresas
        ADD COLUMN IF NOT EXISTS endereco VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
        ADD COLUMN IF NOT EXISTS estado VARCHAR(2),
        ADD COLUMN IF NOT EXISTS cep VARCHAR(12),
        ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(30),
        ADD COLUMN IF NOT EXISTS mensagem_comprovante VARCHAR(255),
        ADD COLUMN IF NOT EXISTS permite_estoque_negativo BOOLEAN NOT NULL DEFAULT FALSE;
    `)

    // =====================================================
    // PERFIL DE ESTOQUE
    // =====================================================

    await client.query(`
      ALTER TABLE usuarios
      DROP CONSTRAINT IF EXISTS chk_usuario_perfil;
    `)

    await client.query(`
      ALTER TABLE usuarios
      ADD CONSTRAINT chk_usuario_perfil
      CHECK (
        perfil IN (
          'admin',
          'gerente',
          'operador',
          'estoque'
        )
      );
    `)

    await client.query('COMMIT')

    console.log('')
    console.log('✅ Upgrade concluído.')
    console.log('Produtos: unidade/pesável/PLU/fornecedor OK')
    console.log('Movimentações de estoque: OK')
    console.log('Inventário: OK')
    console.log('Etiquetas de gôndola: OK')
    console.log('Configurações da empresa: OK')
    console.log('Perfil estoque: OK')
  

  // ============================================================
  // RECEBIMENTO DE MERCADORIAS
  // ============================================================
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recebimentos (
      id SERIAL PRIMARY KEY,
      fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
      numero_documento VARCHAR(100),
      observacao TEXT,
      status VARCHAR(30) NOT NULL DEFAULT 'recebido',
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recebimento_itens (
      id SERIAL PRIMARY KEY,
      recebimento_id INTEGER NOT NULL REFERENCES recebimentos(id) ON DELETE CASCADE,
      produto_id INTEGER NOT NULL REFERENCES produtos(id),
      quantidade NUMERIC(14,3) NOT NULL,
      custo_unitario NUMERIC(14,2) NOT NULL DEFAULT 0
    )
  `)
  
  console.log('Recebimento de mercadorias: tabelas prontas.')


  // ============================================================
  // LOTES E VALIDADES
  // ============================================================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS produto_lotes (
      id SERIAL PRIMARY KEY,
      produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
      recebimento_id INTEGER REFERENCES recebimentos(id) ON DELETE SET NULL,
      lote VARCHAR(100) NOT NULL,
      quantidade NUMERIC(14,3) NOT NULL DEFAULT 0,
      validade DATE,
      custo_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_produto_lotes_produto
    ON produto_lotes(produto_id)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_produto_lotes_validade
    ON produto_lotes(validade)
  `)

  console.log('Lotes e validades: OK')

} catch (erro) {
    await client.query('ROLLBACK')
    console.error('')
    console.error('❌ Upgrade cancelado.')
    console.error(erro)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

executar()
