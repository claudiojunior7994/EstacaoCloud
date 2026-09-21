import { useEffect, useState } from 'react'
import './EstoqueOperacao.css'

const API = 'http://localhost:3000/api'

function formatarData(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function formatarNumero(valor) {
  const numero = Number(valor || 0)
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function textoSituacao(lote) {
  if (lote.situacao === 'vencido') return 'Vencido'
  if (lote.situacao === 'critico') return 'Até 7 dias'
  if (lote.situacao === 'atencao') return 'Até 30 dias'
  if (lote.situacao === 'sem_validade') return 'Sem validade'
  return 'Normal'
}

function classeSituacao(lote) {
  if (lote.situacao === 'vencido') return 'status-danger'
  if (lote.situacao === 'critico') return 'status-danger'
  if (lote.situacao === 'atencao') return 'status-warning'
  return 'status-normal'
}

export default function LotesValidades({ token }) {
  const [lotes, setLotes] = useState([])
  const [resumo, setResumo] = useState({
    vencidos: 0,
    ate_7_dias: 0,
    ate_30_dias: 0,
    sem_validade: 0,
  })

  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('todos')
  const [carregando, setCarregando] = useState(false)

  async function carregar(filtroStatus = status) {
    try {
      setCarregando(true)

      const params = new URLSearchParams({
        busca,
        status: filtroStatus,
      })

      const resposta = await fetch(`${API}/lotes?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const dados = await resposta.json()

      if (!resposta.ok) {
        throw new Error(dados.erro || 'Erro ao carregar lotes.')
      }

      setLotes(dados.lotes || [])
      setResumo(
        dados.resumo || {
          vencidos: 0,
          ate_7_dias: 0,
          ate_30_dias: 0,
          sem_validade: 0,
        }
      )
    } catch (erro) {
      alert(erro.message)
    } finally {
      setCarregando(false)
    }
  }

  function trocarStatus(novoStatus) {
    setStatus(novoStatus)
    carregar(novoStatus)
  }

  useEffect(() => {
    carregar('todos')
  }, [token])

  return (
    <div className="estoque-operacao">
      <div className="estoque-page-header">
        <div>
          <p className="eyebrow">CONTROLE DE PERECÍVEIS</p>
          <h2>Lotes e validades</h2>
          <p>
            Acompanhe produtos vencidos e mercadorias próximas do vencimento.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => carregar()}
          disabled={carregando}
        >
          {carregando ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      <div className="validade-resumo">
        <button
          type="button"
          className="validade-card validade-vencido"
          onClick={() => trocarStatus('vencido')}
        >
          <span>VENCIDOS</span>
          <strong>{resumo.vencidos || 0}</strong>
          <small>Retirar / conferir imediatamente</small>
        </button>

        <button
          type="button"
          className="validade-card validade-critico"
          onClick={() => trocarStatus('7dias')}
        >
          <span>PRÓXIMOS 7 DIAS</span>
          <strong>{resumo.ate_7_dias || 0}</strong>
          <small>Prioridade de venda</small>
        </button>

        <button
          type="button"
          className="validade-card validade-atencao"
          onClick={() => trocarStatus('30dias')}
        >
          <span>PRÓXIMOS 30 DIAS</span>
          <strong>{resumo.ate_30_dias || 0}</strong>
          <small>Acompanhar validade</small>
        </button>

        <button
          type="button"
          className="validade-card"
          onClick={() => trocarStatus('sem-validade')}
        >
          <span>SEM VALIDADE</span>
          <strong>{resumo.sem_validade || 0}</strong>
          <small>Lotes sem data informada</small>
        </button>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">CONSULTA</p>
            <h3>Controle de lotes</h3>
          </div>
        </div>

        <div className="estoque-form-grid">
          <div className="form-group estoque-grow">
            <label>Buscar produto, código, PLU ou lote</label>

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') carregar()
              }}
              placeholder="Digite para localizar..."
            />
          </div>

          <div className="form-group">
            <label>Situação</label>

            <select
              value={status}
              onChange={(e) => trocarStatus(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="vencido">Vencidos</option>
              <option value="7dias">Até 7 dias</option>
              <option value="30dias">Até 30 dias</option>
              <option value="sem-validade">Sem validade</option>
            </select>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={() => carregar()}
          >
            Buscar
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Código / PLU</th>
                <th>Lote</th>
                <th>Qtd.</th>
                <th>Validade</th>
                <th>Dias</th>
                <th>Custo</th>
                <th>Situação</th>
              </tr>
            </thead>

            <tbody>
              {lotes.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    {carregando
                      ? 'Carregando...'
                      : 'Nenhum lote encontrado.'}
                  </td>
                </tr>
              ) : (
                lotes.map((lote) => (
                  <tr key={lote.id}>
                    <td>
                      <strong>{lote.produto_nome}</strong>
                    </td>

                    <td>{lote.codigo_barras || lote.plu || '-'}</td>

                    <td>{lote.lote}</td>

                    <td>
                      {formatarNumero(lote.quantidade)}{' '}
                      {lote.unidade || 'UN'}
                    </td>

                    <td>{formatarData(lote.validade)}</td>

                    <td>
                      {lote.dias_para_vencer == null
                        ? '-'
                        : lote.dias_para_vencer < 0
                          ? `${Math.abs(lote.dias_para_vencer)} dia(s) vencido`
                          : `${lote.dias_para_vencer} dia(s)`}
                    </td>

                    <td>{formatarMoeda(lote.custo_unitario)}</td>

                    <td>
                      <span
                        className={`product-status ${classeSituacao(lote)}`}
                      >
                        {textoSituacao(lote)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  )
}
