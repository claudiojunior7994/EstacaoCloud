-- =========================================================
-- ESTACAOCLOUD - BANCO DE DADOS V1
-- PostgreSQL
-- =========================================================


-- =========================================================
-- EMPRESAS
-- =========================================================

CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(150),
    cnpj VARCHAR(20) UNIQUE,
    email VARCHAR(150),
    telefone VARCHAR(30),
    ativa BOOLEAN NOT NULL DEFAULT TRUE,
    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- USUÁRIOS
-- =========================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,

    perfil VARCHAR(30) NOT NULL DEFAULT 'operador',

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (empresa_id, email),

    CONSTRAINT chk_usuario_perfil
        CHECK (perfil IN ('admin', 'gerente', 'operador'))
);

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa
ON usuarios (empresa_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_email
ON usuarios (email);


-- =========================================================
-- CATEGORIAS
-- =========================================================

CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    nome VARCHAR(100) NOT NULL,

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (empresa_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_categorias_empresa
ON categorias (empresa_id);


-- =========================================================
-- FORNECEDORES
-- =========================================================

CREATE TABLE IF NOT EXISTS fornecedores (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(30),
    telefone VARCHAR(30),
    email VARCHAR(150),

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fornecedor_empresa_cnpj
ON fornecedores (empresa_id, cnpj)
WHERE cnpj IS NOT NULL AND cnpj <> '';

CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa
ON fornecedores (empresa_id);


-- =========================================================
-- CLIENTES
-- =========================================================

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    nome VARCHAR(150) NOT NULL,

    cpf_cnpj VARCHAR(30),
    telefone VARCHAR(30),
    email VARCHAR(150),

    nascimento DATE,

    clube BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cliente_empresa_cpf_cnpj
ON clientes (empresa_id, cpf_cnpj)
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj <> '';

CREATE INDEX IF NOT EXISTS idx_clientes_empresa
ON clientes (empresa_id);


-- =========================================================
-- PRODUTOS
-- =========================================================

CREATE TABLE IF NOT EXISTS produtos (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    nome VARCHAR(200) NOT NULL,

    codigo_barras VARCHAR(100) NOT NULL,

    preco NUMERIC(12,2) NOT NULL DEFAULT 0,
    custo NUMERIC(12,2) NOT NULL DEFAULT 0,

    estoque NUMERIC(14,3) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(14,3) NOT NULL DEFAULT 0,

    fornecedor VARCHAR(150),
    categoria VARCHAR(100),

    ativo BOOLEAN NOT NULL DEFAULT TRUE,

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (empresa_id, codigo_barras),

    CONSTRAINT chk_produto_preco
        CHECK (preco >= 0),

    CONSTRAINT chk_produto_custo
        CHECK (custo >= 0),

    CONSTRAINT chk_produto_estoque
        CHECK (estoque >= 0),

    CONSTRAINT chk_produto_estoque_minimo
        CHECK (estoque_minimo >= 0)
);

CREATE INDEX IF NOT EXISTS idx_produtos_empresa
ON produtos (empresa_id);

CREATE INDEX IF NOT EXISTS idx_produtos_codigo
ON produtos (codigo_barras);

CREATE INDEX IF NOT EXISTS idx_produtos_nome
ON produtos (nome);


-- =========================================================
-- CAIXAS
-- =========================================================

CREATE TABLE IF NOT EXISTS caixas (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    terminal VARCHAR(30) NOT NULL DEFAULT '001',

    usuario_abertura_id INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    valor_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,

    vendas_dinheiro NUMERIC(12,2) NOT NULL DEFAULT 0,
    vendas_pix NUMERIC(12,2) NOT NULL DEFAULT 0,
    vendas_debito NUMERIC(12,2) NOT NULL DEFAULT 0,
    vendas_credito NUMERIC(12,2) NOT NULL DEFAULT 0,

    sangrias NUMERIC(12,2) NOT NULL DEFAULT 0,

    status VARCHAR(20) NOT NULL DEFAULT 'aberto',

    aberto_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fechado_em TIMESTAMP,

    usuario_fechamento_id INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    valor_informado_fechamento NUMERIC(12,2),

    saldo_teorico NUMERIC(12,2),

    diferenca NUMERIC(12,2),

    CONSTRAINT chk_caixa_status
        CHECK (status IN ('aberto', 'fechado')),

    CONSTRAINT chk_caixa_valor_inicial
        CHECK (valor_inicial >= 0)
);

CREATE INDEX IF NOT EXISTS idx_caixas_empresa
ON caixas (empresa_id);

CREATE INDEX IF NOT EXISTS idx_caixas_terminal
ON caixas (empresa_id, terminal);

CREATE INDEX IF NOT EXISTS idx_caixas_status
ON caixas (empresa_id, status);


-- Impede dois caixas abertos simultaneamente
-- no mesmo terminal da mesma empresa.

CREATE UNIQUE INDEX IF NOT EXISTS uq_caixa_aberto_terminal
ON caixas (empresa_id, terminal)
WHERE status = 'aberto';


-- =========================================================
-- MOVIMENTOS DE CAIXA
-- =========================================================

CREATE TABLE IF NOT EXISTS movimentos_caixa (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    caixa_id INTEGER NOT NULL
        REFERENCES caixas(id)
        ON DELETE CASCADE,

    terminal VARCHAR(30) NOT NULL,

    tipo VARCHAR(30) NOT NULL,

    valor NUMERIC(12,2) NOT NULL DEFAULT 0,

    usuario_id INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    descricao VARCHAR(255),

    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_movimento_caixa_tipo
        CHECK (
            tipo IN (
                'abertura',
                'sangria',
                'fechamento'
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_empresa
ON movimentos_caixa (empresa_id);

CREATE INDEX IF NOT EXISTS idx_movimentos_caixa_id
ON movimentos_caixa (caixa_id);

CREATE INDEX IF NOT EXISTS idx_movimentos_terminal
ON movimentos_caixa (empresa_id, terminal);


-- =========================================================
-- VENDAS
-- =========================================================

CREATE TABLE IF NOT EXISTS vendas (
    id SERIAL PRIMARY KEY,

    empresa_id INTEGER NOT NULL
        REFERENCES empresas(id)
        ON DELETE CASCADE,

    usuario_id INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    caixa_id INTEGER
        REFERENCES caixas(id)
        ON DELETE SET NULL,

    terminal VARCHAR(30) NOT NULL DEFAULT '001',

    cliente_id INTEGER
        REFERENCES clientes(id)
        ON DELETE SET NULL,

    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,

    desconto NUMERIC(12,2) NOT NULL DEFAULT 0,

    total NUMERIC(12,2) NOT NULL DEFAULT 0,

    forma_pagamento VARCHAR(40) NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'concluida',

    criada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    cancelada_em TIMESTAMP,

    cancelada_por INTEGER
        REFERENCES usuarios(id)
        ON DELETE SET NULL,

    CONSTRAINT chk_venda_status
        CHECK (status IN ('concluida', 'cancelada')),

    CONSTRAINT chk_venda_pagamento
        CHECK (
            forma_pagamento IN (
                'Pix',
                'Dinheiro',
                'Cartão de débito',
                'Cartão de crédito'
            )
        ),

    CONSTRAINT chk_venda_subtotal
        CHECK (subtotal >= 0),

    CONSTRAINT chk_venda_desconto
        CHECK (desconto >= 0),

    CONSTRAINT chk_venda_total
        CHECK (total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_vendas_empresa
ON vendas (empresa_id);

CREATE INDEX IF NOT EXISTS idx_vendas_caixa
ON vendas (caixa_id);

CREATE INDEX IF NOT EXISTS idx_vendas_cliente
ON vendas (cliente_id);

CREATE INDEX IF NOT EXISTS idx_vendas_data
ON vendas (empresa_id, criada_em);

CREATE INDEX IF NOT EXISTS idx_vendas_status
ON vendas (empresa_id, status);


-- =========================================================
-- ITENS DAS VENDAS
-- =========================================================

CREATE TABLE IF NOT EXISTS venda_itens (
    id SERIAL PRIMARY KEY,

    venda_id INTEGER NOT NULL
        REFERENCES vendas(id)
        ON DELETE CASCADE,

    produto_id INTEGER
        REFERENCES produtos(id)
        ON DELETE SET NULL,

    nome_produto VARCHAR(200) NOT NULL,

    quantidade NUMERIC(14,3) NOT NULL,

    preco_unitario NUMERIC(12,2) NOT NULL,

    subtotal NUMERIC(12,2) NOT NULL,

    CONSTRAINT chk_item_quantidade
        CHECK (quantidade > 0),

    CONSTRAINT chk_item_preco
        CHECK (preco_unitario >= 0),

    CONSTRAINT chk_item_subtotal
        CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_venda_itens_venda
ON venda_itens (venda_id);

CREATE INDEX IF NOT EXISTS idx_venda_itens_produto
ON venda_itens (produto_id);