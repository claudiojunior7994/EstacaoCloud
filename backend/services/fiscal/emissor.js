const {
  DefaultXmlBuilder,
} = require('@brasil-fiscal/nfe')

const {
  buscarDadosEmissao,
} = require('./nfce')

function somenteNumeros(valor) {
  return String(valor || '').replace(/\D/g, '')
}

function numero(valor, padrao = 0) {
  const n = Number(valor)
  return Number.isFinite(n) ? n : padrao
}

function arredondar(valor) {
  return Math.round((numero(valor) + Number.EPSILON) * 100) / 100
}

function mapearCrt(regime) {
  const mapa = {
    simples_nacional: 1,
    simples_excesso: 2,
    regime_normal: 3,
  }

  const crt = mapa[String(regime || '').trim()]

  if (!crt) {
    throw new Error(
      'Regime tributário da empresa não configurado.',
    )
  }

  return crt
}

function ambienteNumerico(ambiente) {
  if (ambiente === 'producao') return 1
  if (ambiente === 'homologacao') return 2

  throw new Error('Ambiente NFC-e inválido.')
}

function validarEmitente(nfce) {
  const obrigatorios = [
    ['CNPJ', nfce.cnpj],
    ['Inscrição Estadual', nfce.inscricao_estadual],
    ['Logradouro', nfce.logradouro],
    ['Número', nfce.numero_endereco],
    ['Bairro', nfce.bairro],
    ['Cidade', nfce.cidade],
    ['UF', nfce.estado],
    ['CEP', nfce.cep],
    ['Código IBGE do município', nfce.codigo_municipio_ibge],
  ]

  const faltando = obrigatorios
    .filter(([, valor]) => !String(valor || '').trim())
    .map(([nome]) => nome)

  if (faltando.length) {
    throw new Error(
      `Dados fiscais incompletos: ${faltando.join(', ')}.`,
    )
  }
}

function montarDestinatario(documento) {
  const doc = somenteNumeros(documento)

  if (!doc) {
    return undefined
  }

  /*
   * O schema da biblioteca exige nome/endereço para destinatário.
   * Não vamos inventar esses dados.
   *
   * O CPF/CNPJ informado no PDV continuará registrado na venda/NFC-e,
   * mas a inclusão formal do destinatário no XML será tratada conforme
   * a regra específica de NFC-e utilizada na etapa de transmissão.
   */
  return undefined
}

function mapearFormaPagamento(forma) {
  const mapa = {
    Dinheiro: '01',
    Cheque: '02',
    Crédito: '03',
    Credito: '03',
    'Cartão de crédito': '03',
    'Cartao de credito': '03',

    Débito: '04',
    Debito: '04',
    'Cartão de débito': '04',
    'Cartao de debito': '04',
    'Vale Alimentação': '10',
    'Vale Refeição': '11',
    'Vale Presente': '12',
    Pix: '17',
    PIX: '17',
  }

  return mapa[String(forma || '').trim()] || '99'
}

function montarPagamentos(pagamentos) {
  return {
    pagamentos: pagamentos.map((p) => ({
      formaPagamento:
        mapearFormaPagamento(p.forma_pagamento),
      valor: arredondar(p.valor),
    })),
  }
}

function montarProduto(item, indice, crt) {
  const quantidade = numero(item.quantidade)
  const valorUnitario = numero(item.preco_unitario)
  const valorTotal = arredondar(item.subtotal)

  if (!item.ncm) {
    throw new Error(
      `Produto "${item.nome_produto}" sem NCM.`,
    )
  }

  if (!item.cfop) {
    throw new Error(
      `Produto "${item.nome_produto}" sem CFOP.`,
    )
  }

  if (!item.cst_pis) {
    throw new Error(
      `Produto "${item.nome_produto}" sem CST PIS.`,
    )
  }

  if (!item.cst_cofins) {
    throw new Error(
      `Produto "${item.nome_produto}" sem CST COFINS.`,
    )
  }

  if (crt === 1 && !item.csosn) {
    throw new Error(
      `Produto "${item.nome_produto}" sem CSOSN.`,
    )
  }

  if (crt !== 1 && !item.cst_icms) {
    throw new Error(
      `Produto "${item.nome_produto}" sem CST ICMS.`,
    )
  }

  const icms = {
    origem: Number(item.origem_mercadoria || 0),
  }

  if (crt === 1) {
    icms.csosn = String(item.csosn)
  } else {
    icms.cst = String(item.cst_icms)
  }

  if (item.aliquota_icms != null) {
    icms.aliquota = numero(item.aliquota_icms)
    icms.baseCalculo = valorTotal
    icms.valor = arredondar(
      valorTotal * numero(item.aliquota_icms) / 100,
    )
  }

  const pis = {
    cst: String(item.cst_pis),
  }

  if (item.aliquota_pis != null) {
    pis.baseCalculo = valorTotal
    pis.aliquota = numero(item.aliquota_pis)
    pis.valor = arredondar(
      valorTotal * numero(item.aliquota_pis) / 100,
    )
  }

  const cofins = {
    cst: String(item.cst_cofins),
  }

  if (item.aliquota_cofins != null) {
    cofins.baseCalculo = valorTotal
    cofins.aliquota = numero(item.aliquota_cofins)
    cofins.valor = arredondar(
      valorTotal * numero(item.aliquota_cofins) / 100,
    )
  }

  const produto = {
    numero: indice + 1,
    codigo:
      String(item.codigo_barras || item.produto_id),
    descricao: String(item.nome_produto),
    ncm: somenteNumeros(item.ncm),
    cfop: somenteNumeros(item.cfop),
    unidade:
      String(item.unidade || 'UN').trim().toUpperCase(),
    quantidade,
    valorUnitario,
    valorTotal,
    icms,
    pis,
    cofins,
  }

  if (item.cest) {
    produto.cest = somenteNumeros(item.cest)
  }

  if (item.codigo_barras) {
    produto.ean = somenteNumeros(item.codigo_barras)
    produto.eanTributavel =
      somenteNumeros(item.codigo_barras)
  }

  const temIbsCbs =
    item.cst_ibs_cbs &&
    item.cclass_trib &&
    item.aliquota_ibs_uf != null &&
    item.aliquota_ibs_municipal != null &&
    item.aliquota_cbs != null

  if (temIbsCbs) {
    produto.ibsCbs = {
      cst: String(item.cst_ibs_cbs),
      cClassTrib: String(item.cclass_trib),
      pIBSUF: numero(item.aliquota_ibs_uf),
      pIBSMun: numero(item.aliquota_ibs_municipal),
      pCBS: numero(item.aliquota_cbs),
    }
  }

  return produto
}

async function montarNfce(nfceId) {
  const {
    nfce,
    itens,
    pagamentos,
  } = await buscarDadosEmissao(nfceId)

  validarEmitente(nfce)

  if (!itens.length) {
    throw new Error('Venda sem itens para emissão.')
  }

  if (!pagamentos.length) {
    throw new Error(
      'Venda sem pagamentos para emissão.',
    )
  }

  const crt = mapearCrt(nfce.regime_tributario)

  const documento =
    somenteNumeros(nfce.documento_consumidor)

  const dados = {
    identificacao: {
      naturezaOperacao: 'VENDA',
      tipoOperacao: 1,
      destinoOperacao: 1,
      finalidade: 1,
      consumidorFinal: 1,
      presencaComprador: 1,
      uf: String(nfce.estado).toUpperCase(),
      municipio: String(nfce.codigo_municipio_ibge),
      serie: Number(nfce.serie),
      numero: Number(nfce.numero),
      dataEmissao: new Date(nfce.venda_criada_em),
      tipoEmissao: 1,
      tipoImpressao: 4,
      ambiente: ambienteNumerico(nfce.ambiente),
      modelo: '65',
    },

    emitente: {
      cnpj: somenteNumeros(nfce.cnpj),
      razaoSocial: String(nfce.empresa_nome),
      nomeFantasia:
        nfce.nome_fantasia || undefined,
      inscricaoEstadual:
        somenteNumeros(nfce.inscricao_estadual),
      regimeTributario: crt,

      endereco: {
        logradouro: String(nfce.logradouro),
        numero: String(nfce.numero_endereco),
        complemento:
          nfce.complemento || undefined,
        bairro: String(nfce.bairro),
        codigoMunicipio:
          String(nfce.codigo_municipio_ibge),
        municipio: String(nfce.cidade),
        uf: String(nfce.estado).toUpperCase(),
        cep: somenteNumeros(nfce.cep),
        codigoPais: '1058',
        pais: 'BRASIL',
        telefone:
          somenteNumeros(nfce.telefone) || undefined,
      },
    },

    produtos: itens.map(
      (item, indice) =>
        montarProduto(item, indice, crt),
    ),

    transporte: {
      modalidadeFrete: 9,
    },

    pagamento: montarPagamentos(pagamentos),

    informacoesComplementares:
      documento
        ? `Documento do consumidor: ${documento}`
        : undefined,
  }

  const destinatario =
    montarDestinatario(documento)

  if (destinatario) {
    dados.destinatario = destinatario
  }

  return dados
}

async function gerarXmlNfce(nfceId) {
  const dados = await montarNfce(nfceId)
  const builder = new DefaultXmlBuilder()
  const xml = builder.build(dados)

  return {
    dados,
    xml,
  }
}

module.exports = {
  montarNfce,
  gerarXmlNfce,
  mapearCrt,
  mapearFormaPagamento,
}
