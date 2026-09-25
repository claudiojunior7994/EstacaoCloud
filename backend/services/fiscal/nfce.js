const crypto = require('crypto')

const CODIGOS_UF = {
  AC: '12',
  AL: '27',
  AP: '16',
  AM: '13',
  BA: '29',
  CE: '23',
  DF: '53',
  ES: '32',
  GO: '52',
  MA: '21',
  MT: '51',
  MS: '50',
  MG: '31',
  PA: '15',
  PB: '25',
  PR: '41',
  PE: '26',
  PI: '22',
  RJ: '33',
  RN: '24',
  RS: '43',
  RO: '11',
  RR: '14',
  SC: '42',
  SP: '35',
  SE: '28',
  TO: '17',
}

const ENDPOINTS_SP = {
  homologacao: {
    autorizacao:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    retornoAutorizacao:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx',
    consultaProtocolo:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    inutilizacao:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx',
    recepcaoEvento:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx',
    statusServico:
      'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    qrCode:
      'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode',
    consultaPublica:
      'https://www.homologacao.nfce.fazenda.sp.gov.br/consulta',
  },

  producao: {
    autorizacao:
      'https://nfce.fazenda.sp.gov.br/ws/NFeAutorizacao4.asmx',
    retornoAutorizacao:
      'https://nfce.fazenda.sp.gov.br/ws/NFeRetAutorizacao4.asmx',
    consultaProtocolo:
      'https://nfce.fazenda.sp.gov.br/ws/NFeConsultaProtocolo4.asmx',
    inutilizacao:
      'https://nfce.fazenda.sp.gov.br/ws/NFeInutilizacao4.asmx',
    recepcaoEvento:
      'https://nfce.fazenda.sp.gov.br/ws/NFeRecepcaoEvento4.asmx',
    statusServico:
      'https://nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx',
    qrCode:
      'https://www.nfce.fazenda.sp.gov.br/qrcode',
    consultaPublica:
      'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica',
  },
}

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '')
}

function pad(valor, tamanho) {
  return String(valor).padStart(tamanho, '0')
}

function codigoUf(uf) {
  return CODIGOS_UF[
    String(uf || '').trim().toUpperCase()
  ] || null
}

function calcularDvChave(chave43) {
  const numeros = somenteNumeros(chave43)

  if (numeros.length !== 43) {
    throw new Error(
      'A base da chave de acesso precisa possuir 43 dígitos.',
    )
  }

  let peso = 2
  let soma = 0

  for (let i = numeros.length - 1; i >= 0; i -= 1) {
    soma += Number(numeros[i]) * peso

    peso += 1

    if (peso > 9) {
      peso = 2
    }
  }

  const resto = soma % 11
  const dv = 11 - resto

  return dv === 10 || dv === 11
    ? 0
    : dv
}

function gerarCodigoNumerico() {
  /*
   * cNF: 8 posições.
   *
   * O valor é gerado criptograficamente.
   * Ele NÃO representa autorização fiscal.
   */
  return String(
    crypto.randomInt(0, 100000000),
  ).padStart(8, '0')
}

function gerarChaveAcesso({
  uf,
  dataEmissao = new Date(),
  cnpj,
  modelo = 65,
  serie,
  numero,
  tipoEmissao = 1,
  codigoNumerico,
}) {
  const cUf = codigoUf(uf)

  if (!cUf) {
    throw new Error('UF inválida para geração da chave.')
  }

  const cnpjNumerico = somenteNumeros(cnpj)

  if (cnpjNumerico.length !== 14) {
    throw new Error(
      'CNPJ precisa possuir 14 dígitos para geração da chave.',
    )
  }

  const data = new Date(dataEmissao)

  if (Number.isNaN(data.getTime())) {
    throw new Error('Data de emissão inválida.')
  }

  const aa = String(data.getFullYear()).slice(-2)
  const mm = pad(data.getMonth() + 1, 2)

  const mod = pad(modelo, 2)
  const serieFormatada = pad(serie, 3)
  const numeroFormatado = pad(numero, 9)
  const tpEmis = String(tipoEmissao)

  const cNF =
    codigoNumerico || gerarCodigoNumerico()

  if (!/^\d{8}$/.test(cNF)) {
    throw new Error(
      'Código numérico da NFC-e deve possuir 8 dígitos.',
    )
  }

  const base =
    cUf +
    aa +
    mm +
    cnpjNumerico +
    mod +
    serieFormatada +
    numeroFormatado +
    tpEmis +
    cNF

  if (base.length !== 43) {
    throw new Error(
      `Base inválida da chave de acesso: ${base.length} dígitos.`,
    )
  }

  const dv = calcularDvChave(base)

  return {
    chave: base + dv,
    codigoNumerico: cNF,
    dv,
    codigoUf: cUf,
    anoMes: aa + mm,
  }
}

function endpointsSefaz({
  uf,
  ambiente,
}) {
  const ufNormalizada =
    String(uf || '').trim().toUpperCase()

  const ambienteNormalizado =
    String(ambiente || '').trim().toLowerCase()

  if (!['homologacao', 'producao'].includes(
    ambienteNormalizado,
  )) {
    throw new Error(
      'Ambiente fiscal inválido.',
    )
  }

  /*
   * Primeiro autorizador preparado:
   * SEFAZ São Paulo.
   *
   * Outras UFs serão adicionadas no registro de autorizadores
   * sem espalhar URLs pelo restante do sistema.
   */
  if (ufNormalizada !== 'SP') {
    return null
  }

  return ENDPOINTS_SP[ambienteNormalizado]
}

function validarPreflight(empresa) {
  const ausentes = []

  const obrigatorios = [
    ['CNPJ', empresa.cnpj],
    [
      'Inscrição Estadual',
      empresa.inscricao_estadual,
    ],
    ['UF', empresa.estado],
    ['Cidade', empresa.cidade],
    [
      'Código IBGE do município',
      empresa.codigo_municipio_ibge,
    ],
    [
      'Regime tributário',
      empresa.regime_tributario,
    ],
    ['ID CSC', empresa.nfce_csc_id],
    ['CSC', empresa.nfce_csc],
  ]

  for (const [nome, valor] of obrigatorios) {
    if (!String(valor || '').trim()) {
      ausentes.push(nome)
    }
  }

  const serie =
    Number(empresa.nfce_serie)

  const proximoNumero =
    Number(empresa.nfce_proximo_numero)

  if (!Number.isInteger(serie) || serie <= 0) {
    ausentes.push('Série NFC-e válida')
  }

  if (
    !Number.isInteger(proximoNumero) ||
    proximoNumero <= 0
  ) {
    ausentes.push('Próximo número NFC-e válido')
  }

  const ambiente =
    String(empresa.nfce_ambiente || '')

  if (
    !['homologacao', 'producao'].includes(ambiente)
  ) {
    ausentes.push('Ambiente fiscal válido')
  }

  const uf =
    String(empresa.estado || '')
      .trim()
      .toUpperCase()

  const endpoints =
    endpointsSefaz({
      uf,
      ambiente:
        ['homologacao', 'producao'].includes(ambiente)
          ? ambiente
          : 'homologacao',
    })

  return {
    pronto:
      ausentes.length === 0 &&
      Boolean(endpoints),

    dadosFiscaisCompletos:
      ausentes.length === 0,

    autorizadorConfigurado:
      Boolean(endpoints),

    certificadoConfigurado: false,

    ausentes,

    uf,

    ambiente,

    modelo: 65,

    versaoLeiaute: '4.00',

    qrCodeVersao: 3,

    endpoints,
  }
}


async function buscarDadosEmissao(nfceId) {
  const { pool } = require('../../database/db')

  const resultado = await pool.query(
    `
    SELECT
      n.*,

      v.criada_em AS venda_criada_em,
      v.subtotal AS venda_subtotal,
      v.desconto AS venda_desconto,
      v.total AS venda_total,
      v.forma_pagamento,
      v.terminal,

      e.nome AS empresa_nome,
      e.nome_fantasia,
      e.cnpj,
      e.inscricao_estadual,
      e.telefone,
      e.logradouro,
      e.numero_endereco,
      e.complemento,
      e.bairro,
      e.cidade,
      e.estado,
      e.cep,
      e.codigo_municipio_ibge,
      e.regime_tributario,
      e.nfce_csc_id

    FROM nfce n

    INNER JOIN vendas v
      ON v.id = n.venda_id
     AND v.empresa_id = n.empresa_id

    INNER JOIN empresas e
      ON e.id = n.empresa_id

    WHERE n.id = $1
    LIMIT 1
    `,
    [nfceId],
  )

  const nfce = resultado.rows[0]

  if (!nfce) {
    throw new Error(
      'NFC-e não encontrada para emissão.',
    )
  }

  const itensResultado = await pool.query(
    `
    SELECT
      *
    FROM venda_itens
    WHERE venda_id = $1
    ORDER BY id
    `,
    [nfce.venda_id],
  )

  const pagamentosResultado =
    await pool.query(
      `
      SELECT
        forma_pagamento,
        valor
      FROM venda_pagamentos
      WHERE venda_id = $1
      ORDER BY id
      `,
      [nfce.venda_id],
    )

  let pagamentos =
    pagamentosResultado.rows

  /*
   * Compatibilidade com vendas históricas anteriores
   * à tabela venda_pagamentos.
   */
  if (!pagamentos.length) {
    pagamentos = [
      {
        forma_pagamento:
          nfce.forma_pagamento,
        valor:
          Number(nfce.venda_total || 0),
      },
    ]
  }

  return {
    nfce,
    itens: itensResultado.rows,
    pagamentos,
  }
}

module.exports = {
  CODIGOS_UF,
  calcularDvChave,
  gerarCodigoNumerico,
  gerarChaveAcesso,
  endpointsSefaz,
  validarPreflight,
  buscarDadosEmissao,
}
