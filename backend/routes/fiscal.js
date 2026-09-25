const express = require('express')

const { pool } = require('../database/db')
const autenticar = require('../middleware/auth')
const permitirPerfis = require('../middleware/permissao')
const {
  validarPreflight,
  endpointsSefaz,
} = require('../services/fiscal/nfce')

const {
  gerarXmlNfce,
} = require('../services/fiscal/emissor')
const {
  diagnosticarCertificado,
  diagnosticarOpenSsl,
  verificarPfxComOpenSsl,
} = require('../services/fiscal/certificado')

const router = express.Router()

function mapNfce(row) {
  if (!row) {
    return null
  }

  return {
    id: row.id,
    vendaId: row.venda_id,
    ambiente: row.ambiente,
    serie: Number(row.serie),
    numero: Number(row.numero),
    status: row.status,
    chaveAcesso: row.chave_acesso || null,
    protocolo: row.protocolo || null,
    documentoConsumidor:
      row.documento_consumidor || '',
    motivoRejeicao:
      row.motivo_rejeicao || null,
    qrCodeUrl:
      row.qr_code_url || null,
    criadaEm: row.criada_em,
    autorizadaEm: row.autorizada_em,
  }
}


router.get(
  '/certificado/diagnostico',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const certificado =
        diagnosticarCertificado()

      const openssl =
        diagnosticarOpenSsl()

      return res.json({
        certificado,
        openssl,

        prontoParaValidacao:
          certificado.configurado &&
          certificado.arquivoExiste &&
          certificado.extensaoValida &&
          certificado.senhaConfigurada &&
          openssl.disponivel,

        seguranca: {
          senhaExposta: false,
          certificadoExposto: false,
        },
      })
    } catch (erro) {
      console.error(
        'Erro no diagnóstico do certificado:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível diagnosticar o certificado A1.',
      })
    }
  },
)

router.post(
  '/certificado/validar',
  autenticar,
  permitirPerfis('admin'),
  async (req, res) => {
    try {
      const resultado =
        verificarPfxComOpenSsl()

      if (!resultado.valido) {
        return res.status(422).json({
          valido: false,
          motivo:
            resultado.motivo,
          certificado:
            resultado.diagnostico,
          openssl:
            resultado.openssl,
        })
      }

      return res.json({
        valido: true,
        mensagem:
          'Arquivo PKCS#12 aberto com sucesso.',
        certificado:
          resultado.diagnostico,
        openssl:
          resultado.openssl,

        observacao:
          'Esta validação não transmite documento fiscal.',
      })
    } catch (erro) {
      console.error(
        'Erro ao validar certificado:',
        erro,
      )

      return res.status(422).json({
        valido: false,
        erro:
          'Não foi possível validar o certificado A1.',
      })
    }
  },
)

router.get(
  '/preflight',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT
          cnpj,
          inscricao_estadual,
          estado,
          cidade,
          codigo_municipio_ibge,
          regime_tributario,
          nfce_habilitada,
          nfce_ambiente,
          nfce_serie,
          nfce_proximo_numero,
          nfce_csc_id,
          nfce_csc
        FROM empresas
        WHERE id = $1
        `,
        [req.usuario.empresaId],
      )

      const empresa = resultado.rows[0]

      if (!empresa) {
        return res.status(404).json({
          erro: 'Empresa não encontrada.',
        })
      }

      const diagnostico =
        validarPreflight(empresa)

      return res.json({
        nfceHabilitada:
          empresa.nfce_habilitada === true,

        diagnostico: {
          ...diagnostico,

          /*
           * O CSC nunca sai desta API.
           * Apenas informamos se a configuração existe.
           */
          cscConfigurado:
            Boolean(
              String(
                empresa.nfce_csc || '',
              ).trim(),
            ),
        },
      })
    } catch (erro) {
      console.error(
        'Erro no preflight fiscal:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível executar o diagnóstico fiscal.',
      })
    }
  },
)

router.get(
  '/sefaz/endpoints',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT
          estado,
          nfce_ambiente
        FROM empresas
        WHERE id = $1
        `,
        [req.usuario.empresaId],
      )

      const empresa = resultado.rows[0]

      if (!empresa) {
        return res.status(404).json({
          erro: 'Empresa não encontrada.',
        })
      }

      const endpoints =
        endpointsSefaz({
          uf: empresa.estado,
          ambiente:
            empresa.nfce_ambiente ||
            'homologacao',
        })

      if (!endpoints) {
        return res.status(501).json({
          erro:
            'Autorizador desta UF ainda não foi cadastrado no EstacaoCloud.',
          uf: empresa.estado,
        })
      }

      return res.json({
        uf: empresa.estado,
        ambiente:
          empresa.nfce_ambiente,
        versao: '4.00',
        modelo: 65,
        endpoints,
      })
    } catch (erro) {
      console.error(
        'Erro ao carregar endpoints SEFAZ:',
        erro,
      )

      return res.status(500).json({
        erro:
          'Não foi possível carregar os endpoints SEFAZ.',
      })
    }
  },
)

router.get(
  '/configuracao',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT
          id,
          nome,
          nome_fantasia,
          cnpj,
          inscricao_estadual,
          estado,
          cidade,
          codigo_municipio_ibge,
          regime_tributario,
          nfce_habilitada,
          nfce_ambiente,
          nfce_serie,
          nfce_proximo_numero,
          nfce_csc_id,
          CASE
            WHEN nfce_csc IS NOT NULL
              AND LENGTH(TRIM(nfce_csc)) > 0
            THEN TRUE
            ELSE FALSE
          END AS nfce_csc_configurado
        FROM empresas
        WHERE id = $1
        `,
        [req.usuario.empresaId],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'Empresa não encontrada.',
        })
      }

      return res.json({
        configuracao: resultado.rows[0],
      })
    } catch (erro) {
      console.error(
        'Erro ao carregar configuração fiscal:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível carregar a configuração fiscal.',
      })
    }
  },
)

router.get(
  '/nfce',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const limiteSolicitado =
        Number(req.query.limite) || 50

      const limite =
        Math.min(Math.max(limiteSolicitado, 1), 200)

      const resultado = await pool.query(
        `
        SELECT *
        FROM nfce
        WHERE empresa_id = $1
        ORDER BY criada_em DESC, id DESC
        LIMIT $2
        `,
        [
          req.usuario.empresaId,
          limite,
        ],
      )

      return res.json({
        nfces: resultado.rows.map(mapNfce),
      })
    } catch (erro) {
      console.error(
        'Erro ao listar NFC-e:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível listar as NFC-e.',
      })
    }
  },
)

router.get(
  '/nfce/venda/:vendaId',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM nfce
        WHERE empresa_id = $1
          AND venda_id = $2
        LIMIT 1
        `,
        [
          req.usuario.empresaId,
          req.params.vendaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'NFC-e não encontrada para esta venda.',
        })
      }

      return res.json({
        nfce: mapNfce(resultado.rows[0]),
      })
    } catch (erro) {
      console.error(
        'Erro ao consultar NFC-e da venda:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível consultar a NFC-e.',
      })
    }
  },
)

router.get(
  '/nfce/:id',
  autenticar,
  permitirPerfis('admin', 'gerente', 'operador'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM nfce
        WHERE id = $1
          AND empresa_id = $2
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      if (!resultado.rows[0]) {
        return res.status(404).json({
          erro: 'NFC-e não encontrada.',
        })
      }

      return res.json({
        nfce: mapNfce(resultado.rows[0]),
      })
    } catch (erro) {
      console.error(
        'Erro ao consultar NFC-e:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível consultar a NFC-e.',
      })
    }
  },
)


/*
 * Gera o XML de trabalho da NFC-e.
 *
 * NÃO assina.
 * NÃO transmite.
 * NÃO autoriza.
 *
 * Esta rota existe para validar a estrutura fiscal antes
 * de conectar certificado digital e SEFAZ.
 */
router.post(
  '/nfce/:id/preparar-xml',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT *
        FROM nfce
        WHERE id = $1
          AND empresa_id = $2
        LIMIT 1
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      const nota = resultado.rows[0]

      if (!nota) {
        return res.status(404).json({
          erro: 'NFC-e não encontrada.',
        })
      }

      if (nota.status === 'autorizada') {
        return res.status(409).json({
          erro:
            'NFC-e já autorizada não pode ter XML de envio recriado.',
        })
      }

      const {
        dados,
        xml,
      } = await gerarXmlNfce(nota.id)

      if (
        !xml ||
        typeof xml !== 'string'
      ) {
        throw new Error(
          'O gerador fiscal não retornou XML válido.',
        )
      }

      await pool.query(
        `
        UPDATE nfce
        SET
          xml_envio = $1,
          atualizada_em =
            CURRENT_TIMESTAMP
        WHERE id = $2
          AND empresa_id = $3
        `,
        [
          xml,
          nota.id,
          req.usuario.empresaId,
        ],
      )

      return res.json({
        mensagem:
          'XML NFC-e preparado. Documento ainda não foi assinado nem transmitido.',
        nfce: {
          id: nota.id,
          serie: Number(nota.serie),
          numero: Number(nota.numero),
          chaveAcesso:
            nota.chave_acesso,
          status:
            nota.status,
        },
        xmlPreparado: true,
        tamanhoXml:
          Buffer.byteLength(xml, 'utf8'),
        resumo: {
          modelo:
            dados?.identificacao?.modelo,
          ambiente:
            nota.ambiente,
          quantidadeItens:
            Array.isArray(dados?.produtos)
              ? dados.produtos.length
              : 0,
        },
      })
    } catch (erro) {
      console.error(
        'Erro ao preparar XML NFC-e:',
        erro,
      )

      return res.status(422).json({
        erro:
          erro.message ||
          'Não foi possível preparar o XML NFC-e.',
        codigo:
          'NFCE_XML_INVALIDO',
      })
    }
  },
)

/*
 * IMPORTANTE:
 *
 * Esta rota NÃO autoriza NFC-e.
 *
 * Ela existe para deixar explícito que a etapa de autorização
 * depende do adaptador SEFAZ, certificado digital, assinatura XML,
 * schemas oficiais e credenciais válidas do emitente.
 *
 * Nenhuma NFC-e deve receber status "autorizada" sem retorno
 * efetivo do autorizador fiscal.
 */
router.post(
  '/nfce/:id/autorizar',
  autenticar,
  permitirPerfis('admin', 'gerente'),
  async (req, res) => {
    try {
      const resultado = await pool.query(
        `
        SELECT
          n.*,
          e.nfce_habilitada,
          e.nfce_ambiente
        FROM nfce n
        INNER JOIN empresas e
          ON e.id = n.empresa_id
        WHERE n.id = $1
          AND n.empresa_id = $2
        `,
        [
          req.params.id,
          req.usuario.empresaId,
        ],
      )

      const nota = resultado.rows[0]

      if (!nota) {
        return res.status(404).json({
          erro: 'NFC-e não encontrada.',
        })
      }

      if (nota.status === 'autorizada') {
        return res.status(409).json({
          erro: 'Esta NFC-e já está autorizada.',
        })
      }

      return res.status(501).json({
        erro:
          'Autorização SEFAZ ainda não configurada para este emitente.',
        codigo: 'SEFAZ_NAO_CONFIGURADA',
        nfce: mapNfce(nota),
      })
    } catch (erro) {
      console.error(
        'Erro ao preparar autorização NFC-e:',
        erro,
      )

      return res.status(500).json({
        erro: 'Não foi possível preparar a autorização da NFC-e.',
      })
    }
  },
)

module.exports = router
