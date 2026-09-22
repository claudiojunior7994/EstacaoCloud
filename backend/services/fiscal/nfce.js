const { pool } = require('../../database/db')

const STATUS_NFCE = Object.freeze({
  PENDENTE: 'pendente',
  PROCESSANDO: 'processando',
  AUTORIZADA: 'autorizada',
  REJEITADA: 'rejeitada',
  ERRO: 'erro',
})

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '')
}

async function buscarDadosEmissao(nfceId) {
  const resultado = await pool.query(
    `
    SELECT
      n.id,
      n.empresa_id,
      n.venda_id,
      n.ambiente,
      n.serie,
      n.numero,
      n.status,
      n.documento_consumidor,

      e.nome AS empresa_nome,
      e.nome_fantasia,
      e.cnpj,
      e.inscricao_estadual,
      e.endereco,
      e.logradouro,
      e.numero_endereco,
      e.complemento,
      e.bairro,
      e.telefone,
      e.cidade,
      e.estado,
      e.cep,
      e.codigo_municipio_ibge,
      e.regime_tributario,

      v.subtotal,
      v.desconto,
      v.total,
      v.criada_em AS venda_criada_em

    FROM nfce n
    JOIN empresas e
      ON e.id = n.empresa_id
    JOIN vendas v
      ON v.id = n.venda_id

    WHERE n.id = $1
    `,
    [nfceId],
  )

  const nfce = resultado.rows[0]

  if (!nfce) {
    throw new Error('NFC-e não encontrada.')
  }

  const itens = await pool.query(
    `
    SELECT
      vi.*
    FROM venda_itens vi
    WHERE vi.venda_id = $1
    ORDER BY vi.id
    `,
    [nfce.venda_id],
  )

  const pagamentos = await pool.query(
    `
    SELECT *
    FROM venda_pagamentos
    WHERE venda_id = $1
    ORDER BY id
    `,
    [nfce.venda_id],
  )

  return {
    nfce: {
      ...nfce,
      cnpj: somenteNumeros(nfce.cnpj),
      documento_consumidor:
        somenteNumeros(nfce.documento_consumidor),
    },
    itens: itens.rows,
    pagamentos: pagamentos.rows,
  }
}

async function atualizarStatus(
  nfceId,
  status,
  dados = {},
) {
  if (!Object.values(STATUS_NFCE).includes(status)) {
    throw new Error('Status NFC-e inválido.')
  }

  const resultado = await pool.query(
    `
    UPDATE nfce
    SET
      status = $2,
      chave_acesso = COALESCE($3, chave_acesso),
      protocolo = COALESCE($4, protocolo),
      xml_envio = COALESCE($5, xml_envio),
      xml_autorizado = COALESCE($6, xml_autorizado),
      motivo_rejeicao = $7,
      qr_code_url = COALESCE($8, qr_code_url),
      autorizada_em =
        CASE
          WHEN $2 = 'autorizada'
          THEN CURRENT_TIMESTAMP
          ELSE autorizada_em
        END
    WHERE id = $1
    RETURNING *
    `,
    [
      nfceId,
      status,
      dados.chaveAcesso || null,
      dados.protocolo || null,
      dados.xmlEnvio || null,
      dados.xmlAutorizado || null,
      dados.motivoRejeicao || null,
      dados.qrCodeUrl || null,
    ],
  )

  if (!resultado.rows[0]) {
    throw new Error('NFC-e não encontrada.')
  }

  return resultado.rows[0]
}

module.exports = {
  STATUS_NFCE,
  buscarDadosEmissao,
  atualizarStatus,
}
