import { useEffect, useState } from 'react'
import './EstoqueOperacao.css'

const API = 'http://localhost:3000/api'

async function apiFetch(url, token, options = {}) {
  const resposta = await fetch(API + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const dados = await resposta.json().catch(() => ({}))

  if (!resposta.ok) {
    throw new Error(dados.erro || 'Erro na operação.')
  }

  return dados
}

function formatarNumero(valor) {
  const numero = Number(valor || 0)
  return Number.isInteger(numero)
    ? String(numero)
    : numero.toLocaleString('pt-BR', {
        maximumFractionDigits: 3,
      })
}

function formatarData(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleString('pt-BR')
}

// ============================================================
// MOVIMENTAÇÕES / AJUSTE
// ============================================================

export function MovimentacoesEstoque({ token, produtos, recarregarProdutos }) {
  const [movimentacoes, setMovimentacoes] = useState([])
  const [produtoId, setProdutoId] = useState('')
  const [novoEstoque, setNovoEstoque] = useState('')
  const [observacao, setObservacao] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function carregar() {
    try {
      const dados = await apiFetch('/estoque/movimentacoes', token)
      setMovimentacoes(dados.movimentacoes || [])
    } catch (erro) {
      alert(erro.message)
    }
  }

  useEffect(() => {
    carregar()
  }, [token])

  async function ajustar(evento) {
    evento.preventDefault()

    if (!produtoId || novoEstoque === '') {
      alert('Selecione o produto e informe o estoque físico.')
      return
    }

    try {
      setCarregando(true)

      const dados = await apiFetch('/estoque/ajuste', token, {
        method: 'POST',
        body: JSON.stringify({
          produtoId: Number(produtoId),
          novoEstoque: Number(novoEstoque),
          observacao,
        }),
      })

      alert(
        `Estoque ajustado. Anterior: ${formatarNumero(
          dados.estoqueAnterior
        )} | Atual: ${formatarNumero(dados.estoqueAtual)}`
      )

      setNovoEstoque('')
      setObservacao('')
      await carregar()

      if (recarregarProdutos) {
        await recarregarProdutos()
      }
    } catch (erro) {
      alert(erro.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="estoque-operacao">
      <div className="estoque-page-header">
        <div>
          <p className="eyebrow">CONTROLE OPERACIONAL</p>
          <h2>Movimentações de estoque</h2>
          <p>Ajustes manuais e rastreabilidade das alterações.</p>
        </div>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">AJUSTE</p>
            <h3>Ajuste manual de estoque</h3>
          </div>
        </div>

        <form className="estoque-form-grid" onSubmit={ajustar}>
          <div className="form-group">
            <label>Produto</label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} — atual: {formatarNumero(produto.estoque)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Novo estoque físico</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={novoEstoque}
              onChange={(e) => setNovoEstoque(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group estoque-grow">
            <label>Observação</label>
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: quebra, perda, conferência..."
            />
          </div>

          <button
            className="primary-button"
            type="submit"
            disabled={carregando}
          >
            {carregando ? 'Ajustando...' : 'Confirmar ajuste'}
          </button>
        </form>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HISTÓRICO</p>
            <h3>Últimas movimentações</h3>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={carregar}
          >
            Atualizar
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Qtd.</th>
                <th>Anterior</th>
                <th>Posterior</th>
                <th>Referência</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan="8">Nenhuma movimentação encontrada.</td>
                </tr>
              ) : (
                movimentacoes.map((m) => (
                  <tr key={m.id}>
                    <td>{formatarData(m.criado_em)}</td>
                    <td>{m.produto_nome}</td>
                    <td>{m.tipo}</td>
                    <td>{formatarNumero(m.quantidade)}</td>
                    <td>{formatarNumero(m.estoque_anterior)}</td>
                    <td>{formatarNumero(m.estoque_posterior)}</td>
                    <td>{m.referencia || '-'}</td>
                    <td>{m.usuario_nome || '-'}</td>
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

// ============================================================
// INVENTÁRIO
// ============================================================

export function InventarioEstoque({ token }) {
  const [inventarios, setInventarios] = useState([])
  const [inventarioAtual, setInventarioAtual] = useState(null)
  const [itens, setItens] = useState([])
  const [descricao, setDescricao] = useState('Inventário geral')

  async function carregarLista() {
    try {
      const dados = await apiFetch('/inventarios', token)
      setInventarios(dados.inventarios || [])
    } catch (erro) {
      alert(erro.message)
    }
  }

  useEffect(() => {
    carregarLista()
  }, [token])

  async function abrirInventario(id) {
    try {
      const dados = await apiFetch(`/inventarios/${id}`, token)
      setInventarioAtual(dados.inventario)
      setItens(dados.itens || [])
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function iniciar() {
    try {
      const dados = await apiFetch('/inventarios', token, {
        method: 'POST',
        body: JSON.stringify({
          descricao: descricao.trim() || 'Inventário geral',
        }),
      })

      await carregarLista()
      await abrirInventario(dados.inventario.id)
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function registrarContagem(item, valor) {
    if (valor === '' || Number(valor) < 0) return

    try {
      const dados = await apiFetch(
        `/inventarios/${inventarioAtual.id}/item/${item.produto_id}`,
        token,
        {
          method: 'PATCH',
          body: JSON.stringify({
            estoqueContado: Number(valor),
          }),
        }
      )

      setItens((lista) =>
        lista.map((atual) =>
          atual.produto_id === item.produto_id
            ? {
                ...atual,
                estoque_contado: dados.item.estoque_contado,
                diferenca: dados.item.diferenca,
              }
            : atual
        )
      )
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function finalizar() {
    if (!inventarioAtual) return

    const confirmou = window.confirm(
      'Finalizar inventário e ajustar automaticamente o estoque?'
    )

    if (!confirmou) return

    try {
      const dados = await apiFetch(
        `/inventarios/${inventarioAtual.id}/finalizar`,
        token,
        { method: 'POST' }
      )

      alert(dados.mensagem)
      setInventarioAtual(null)
      setItens([])
      await carregarLista()
    } catch (erro) {
      alert(erro.message)
    }
  }

  return (
    <div className="estoque-operacao">
      <div className="estoque-page-header">
        <div>
          <p className="eyebrow">CONFERÊNCIA FÍSICA</p>
          <h2>Inventário</h2>
          <p>Contagem de produtos e correção automática das divergências.</p>
        </div>
      </div>

      {!inventarioAtual ? (
        <>
          <article className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">NOVO INVENTÁRIO</p>
                <h3>Iniciar contagem</h3>
              </div>
            </div>

            <div className="estoque-form-grid">
              <div className="form-group estoque-grow">
                <label>Descrição</label>
                <input
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="primary-button"
                onClick={iniciar}
              >
                Iniciar inventário
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <h3>Histórico de inventários</h3>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Descrição</th>
                    <th>Status</th>
                    <th>Itens</th>
                    <th>Contados</th>
                    <th>Iniciado</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarios.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.id}</td>
                      <td>{inv.descricao}</td>
                      <td>{inv.status}</td>
                      <td>{inv.total_itens}</td>
                      <td>{inv.itens_contados}</td>
                      <td>{formatarData(inv.iniciado_em)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action-button"
                          onClick={() => abrirInventario(inv.id)}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : (
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                INVENTÁRIO #{inventarioAtual.id}
              </p>
              <h3>{inventarioAtual.descricao}</h3>
            </div>

            <div className="estoque-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setInventarioAtual(null)
                  setItens([])
                }}
              >
                Voltar
              </button>

              {inventarioAtual.status === 'aberto' && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={finalizar}
                >
                  Finalizar inventário
                </button>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código / PLU</th>
                  <th>Un.</th>
                  <th>Sistema</th>
                  <th>Contagem física</th>
                  <th>Diferença</th>
                </tr>
              </thead>

              <tbody>
                {itens.map((item) => (
                  <tr key={item.produto_id}>
                    <td>{item.nome}</td>
                    <td>{item.codigo_barras || item.plu || '-'}</td>
                    <td>{item.unidade || 'UN'}</td>
                    <td>{formatarNumero(item.estoque_sistema)}</td>
                    <td>
                      {inventarioAtual.status === 'aberto' ? (
                        <input
                          className="estoque-count-input"
                          type="number"
                          min="0"
                          step="0.001"
                          defaultValue={
                            item.estoque_contado == null
                              ? ''
                              : item.estoque_contado
                          }
                          onBlur={(e) =>
                            registrarContagem(item, e.target.value)
                          }
                        />
                      ) : (
                        formatarNumero(item.estoque_contado)
                      )}
                    </td>
                    <td>
                      {item.diferenca == null
                        ? '-'
                        : formatarNumero(item.diferenca)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </div>
  )
}

// ============================================================
// ETIQUETAS
// ============================================================

export function EtiquetasGondola({ token }) {
  const [produtos, setProdutos] = useState([])
  const [fila, setFila] = useState([])
  const [busca, setBusca] = useState('')
  const [quantidades, setQuantidades] = useState({})

  async function buscarProdutos() {
    try {
      const dados = await apiFetch(
        `/etiquetas/produtos?busca=${encodeURIComponent(busca)}`,
        token
      )

      setProdutos(dados.produtos || [])
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function carregarFila() {
    try {
      const dados = await apiFetch('/etiquetas/fila', token)
      setFila(dados.etiquetas || [])
    } catch (erro) {
      alert(erro.message)
    }
  }

  useEffect(() => {
    buscarProdutos()
    carregarFila()
  }, [token])

  async function adicionar(produto) {
    const quantidade = Number(quantidades[produto.id] || 1)

    try {
      await apiFetch('/etiquetas/fila', token, {
        method: 'POST',
        body: JSON.stringify({
          produtoId: produto.id,
          quantidade,
        }),
      })

      await carregarFila()
    } catch (erro) {
      alert(erro.message)
    }
  }

  async function marcarImpressa(id) {
    try {
      await apiFetch(`/etiquetas/${id}/impressa`, token, {
        method: 'POST',
      })

      await carregarFila()
    } catch (erro) {
      alert(erro.message)
    }
  }

  function imprimirFila() {
    if (!fila.length) {
      alert('A fila de etiquetas está vazia.')
      return
    }

    window.print()
  }

  return (
    <div className="estoque-operacao etiquetas-page">
      <div className="estoque-page-header no-print">
        <div>
          <p className="eyebrow">GÔNDOLA</p>
          <h2>Etiquetas de preços</h2>
          <p>Fila rápida para impressão pelos operadores de estoque.</p>
        </div>
      </div>

      <article className="panel no-print">
        <div className="panel-header">
          <h3>Selecionar produtos</h3>
        </div>

        <div className="estoque-form-grid">
          <div className="form-group estoque-grow">
            <label>Buscar produto / código / PLU</label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') buscarProdutos()
              }}
              placeholder="Digite para localizar..."
            />
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={buscarProdutos}
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
                <th>Preço</th>
                <th>Qtd. etiquetas</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td>{produto.nome}</td>
                  <td>{produto.codigo_barras || produto.plu || '-'}</td>
                  <td>
                    R$ {Number(produto.preco || 0).toFixed(2).replace('.', ',')}
                  </td>
                  <td>
                    <input
                      className="estoque-count-input"
                      type="number"
                      min="1"
                      step="1"
                      value={quantidades[produto.id] || 1}
                      onChange={(e) =>
                        setQuantidades((atual) => ({
                          ...atual,
                          [produto.id]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action-button"
                      onClick={() => adicionar(produto)}
                    >
                      + Fila
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="panel etiqueta-print-area">
        <div className="panel-header no-print">
          <div>
            <p className="eyebrow">IMPRESSÃO</p>
            <h3>Fila de etiquetas ({fila.length})</h3>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={imprimirFila}
          >
            🖨️ Imprimir fila
          </button>
        </div>

        {fila.length === 0 ? (
          <p className="no-print">Nenhuma etiqueta aguardando impressão.</p>
        ) : (
          <div className="etiqueta-grid">
            {fila.flatMap((etiqueta) =>
              Array.from(
                { length: Number(etiqueta.quantidade || 1) },
                (_, indice) => (
                  <div
                    className="etiqueta-card"
                    key={`${etiqueta.id}-${indice}`}
                  >
                    <strong>{etiqueta.nome}</strong>

                    <span className="etiqueta-codigo">
                      {etiqueta.codigo_barras ||
                        (etiqueta.plu
                          ? `PLU ${etiqueta.plu}`
                          : '')}
                    </span>

                    <span className="etiqueta-preco">
                      R$ {Number(etiqueta.preco || 0)
                        .toFixed(2)
                        .replace('.', ',')}
                    </span>

                    {etiqueta.preco_clube != null && (
                      <span className="etiqueta-clube">
                        Clube Estação R$ {Number(etiqueta.preco_clube)
                          .toFixed(2)
                          .replace('.', ',')}
                      </span>
                    )}

                    <span className="etiqueta-unidade">
                      {etiqueta.unidade || 'UN'}
                    </span>

                    <button
                      type="button"
                      className="table-action-button no-print"
                      onClick={() => marcarImpressa(etiqueta.id)}
                    >
                      ✓ Impressa
                    </button>
                  </div>
                )
              )
            )}
          </div>
        )}
      </article>
    </div>
  )
}
