const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

function texto(valor) {
  return String(valor == null ? '' : valor).trim()
}

function somenteNumeros(valor) {
  return texto(valor).replace(/\D/g, '')
}

function caminhoCertificado() {
  const configurado =
    texto(process.env.NFCE_CERTIFICADO_PFX)

  if (!configurado) {
    return null
  }

  return path.resolve(configurado)
}

function senhaCertificadoConfigurada() {
  return Boolean(
    texto(process.env.NFCE_CERTIFICADO_SENHA),
  )
}

function diagnosticarOpenSsl() {
  try {
    const saida = execFileSync(
      'openssl',
      ['version'],
      {
        encoding: 'utf8',
        windowsHide: true,
        stdio: [
          'ignore',
          'pipe',
          'pipe',
        ],
      },
    ).trim()

    return {
      disponivel: true,
      versao: saida,
    }
  } catch {
    return {
      disponivel: false,
      versao: null,
    }
  }
}

function diagnosticarCertificado() {
  const caminho = caminhoCertificado()

  if (!caminho) {
    return {
      configurado: false,
      arquivoExiste: false,
      senhaConfigurada:
        senhaCertificadoConfigurada(),
      extensaoValida: false,
      caminhoExibicao: null,
    }
  }

  const extensao =
    path.extname(caminho).toLowerCase()

  return {
    configurado: true,
    arquivoExiste:
      fs.existsSync(caminho),
    senhaConfigurada:
      senhaCertificadoConfigurada(),
    extensaoValida:
      ['.pfx', '.p12'].includes(extensao),

    /*
     * Nunca devolvemos o caminho completo.
     * Apenas o nome do arquivo.
     */
    caminhoExibicao:
      path.basename(caminho),
  }
}

function carregarPfx() {
  const caminho = caminhoCertificado()
  const senha =
    process.env.NFCE_CERTIFICADO_SENHA

  if (!caminho) {
    throw new Error(
      'Certificado A1 não configurado. Defina NFCE_CERTIFICADO_PFX.',
    )
  }

  if (!fs.existsSync(caminho)) {
    throw new Error(
      'Arquivo do certificado A1 não encontrado.',
    )
  }

  const extensao =
    path.extname(caminho).toLowerCase()

  if (!['.pfx', '.p12'].includes(extensao)) {
    throw new Error(
      'Certificado deve utilizar extensão .pfx ou .p12.',
    )
  }

  if (!texto(senha)) {
    throw new Error(
      'Senha do certificado A1 não configurada.',
    )
  }

  return {
    pfx: fs.readFileSync(caminho),
    senha,
  }
}

function verificarPfxComOpenSsl() {
  const diagnostico =
    diagnosticarCertificado()

  const openssl =
    diagnosticarOpenSsl()

  if (!diagnostico.configurado) {
    return {
      valido: false,
      motivo:
        'CERTIFICADO_NAO_CONFIGURADO',
      diagnostico,
      openssl,
    }
  }

  if (!diagnostico.arquivoExiste) {
    return {
      valido: false,
      motivo:
        'CERTIFICADO_NAO_ENCONTRADO',
      diagnostico,
      openssl,
    }
  }

  if (!diagnostico.extensaoValida) {
    return {
      valido: false,
      motivo:
        'EXTENSAO_CERTIFICADO_INVALIDA',
      diagnostico,
      openssl,
    }
  }

  if (!diagnostico.senhaConfigurada) {
    return {
      valido: false,
      motivo:
        'SENHA_CERTIFICADO_NAO_CONFIGURADA',
      diagnostico,
      openssl,
    }
  }

  if (!openssl.disponivel) {
    return {
      valido: false,
      motivo:
        'OPENSSL_NAO_DISPONIVEL',
      diagnostico,
      openssl,
    }
  }

  const caminho =
    caminhoCertificado()

  const senha =
    process.env.NFCE_CERTIFICADO_SENHA

  try {
    /*
     * Apenas verifica se o PKCS#12 pode ser aberto.
     * Nenhuma chave privada é impressa.
     */
    execFileSync(
      'openssl',
      [
        'pkcs12',
        '-in',
        caminho,
        '-passin',
        `pass:${senha}`,
        '-noout',
      ],
      {
        encoding: 'utf8',
        windowsHide: true,
        stdio: [
          'ignore',
          'pipe',
          'pipe',
        ],
      },
    )

    return {
      valido: true,
      motivo: null,
      diagnostico,
      openssl,
    }
  } catch {
    return {
      valido: false,
      motivo:
        'CERTIFICADO_OU_SENHA_INVALIDOS',
      diagnostico,
      openssl,
    }
  }
}

function validarCnpjCertificado({
  cnpjEmpresa,
  subject = '',
}) {
  const cnpj =
    somenteNumeros(cnpjEmpresa)

  if (cnpj.length !== 14) {
    return false
  }

  /*
   * Esta função é apenas auxiliar.
   * A validação definitiva será feita a partir
   * dos metadados X509 extraídos pelo provider
   * quando conectarmos a assinatura.
   */
  return somenteNumeros(subject)
    .includes(cnpj)
}

module.exports = {
  caminhoCertificado,
  senhaCertificadoConfigurada,
  diagnosticarOpenSsl,
  diagnosticarCertificado,
  carregarPfx,
  verificarPfxComOpenSsl,
  validarCnpjCertificado,
}
