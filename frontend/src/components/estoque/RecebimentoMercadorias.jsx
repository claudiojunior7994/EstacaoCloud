import { useEffect, useMemo, useState } from 'react'
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

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function dataHora(valor) {
  if (!valor) return '-'
  return new Date(valor).toLocaleString('pt-BR')
}

export default function RecebimentoMercadorias({
  token,
  produtos = [],
  fornecedores = [],
  recarregarProdutos,
}) {
  const [fornecedorId, setFornecedorId] = useState('')
  const [numeroDocumento, setNumeroDocumento] = useState('')
  const [observacao, setObservacao] = useState('')
  const [produtoId, setProdutoId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [custoUnitario, setCustoUnitario] = useState('')
  const [lote, setLote] = useState('')
  const [validade, setValidade] = useState('')
  const [itens, setItens] = useState([])
  const [historico, setHistorico] = useState([])
  const [salvando, setSalvando] = useState(false)

  async function carregarHistorico() {
    try {
      const dados = await apiFetch('/recebimentos', token)
      setHistorico(dados.recebimentos || [])
    } catch (erro) {
      console.error(erro)
    }
  }

  useEffect(() => {
    carregarHistorico()
  }, [token])

  const total = useMemo(
    () =>
      itens.reduce(
        (soma, item) =>
          soma + Number(item.quantidade) * Number(item.custoUnitario || 0),
        0
      ),
    [itens]
  )

  function adicionarItem() {
    if (!produtoId || Number(quantidade) <= 0) {
      alert('Selecione o produto e informe uma quantidade válida.')
      return
    }

    const produto = produtos.find(
      (item) => Number(item.id) === Number(produtoId)
    )

    if (!produto) {
      alert('Produto não encontrado.')
      return
    }

    const existente = itens.find(
      (item) => Number(item.produtoId) === Number(produtoId)
    )

    if (existente) {
      setItens((lista) =>
        lista.map((item) =>
          Number(item.produtoId) === Number(produtoId)
            ? {
                ...item,
                quantidade:
                  Number(item.quantidade) + Number(quantidade),
                custoUnitario: Number(custoUnitario || item.custoUnitario || 0),
                lote: lote.trim() || item.lote || '',
                validade: validade || item.validade || '',
              }
            : item
        )
      )
    } else {
      setItens((lista) => [
        ...lista,
        {
          produtoId: Number(produtoId),
          nome: produto.nome,
          codigo: produto.codigo_barras || produto.plu || '-',
          unidade: produto.unidade || 'UN',
          quantidade: Number(quantidade),
          custoUnitario: Number(custoUnitario || 0),
          lote: lote.trim(),
          validade,
        },
      ])
    }

    setProdutoId('')
    setQuantidade('')
    setCustoUnitario('')
    setLote('')
    setValidade('')
  }

  function removerItem(produto) {
    setItens((lista) =>
      lista.filter(
        (item) => Number(item.produtoId) !== Number(produto.produtoId)
      )
    )
  }

  async function registrarRecebimento() {
    if (!fornecedorId) {
      alert('Selecione o fornecedor.')
      return
    }

    if (!itens.length) {
      alert('Adicione pelo menos um produto.')
      return
    }

    try {
      setSalvando(true)

      const dados = await apiFetch('/recebimentos', token, {
        method: 'POST',
        body: JSON.stringify({
          fornecedorId: Number(fornecedorId),
          numeroDocumento,
          observacao,
          itens,
        }),
      })

      alert(dados.mensagem || 'Recebimento registrado com sucesso.')

      setFornecedorId('')
      setNumeroDocumento('')
      setObservacao('')
      setItens([])

      await carregarHistorico()

      if (recarregarProdutos) {
        await recarregarProdutos()
      }
    } catch (erro) {
      alert(erro.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="estoque-operacao">
      <div className="estoque-page-header">
        <div>
          <p className="eyebrow">ENTRADA DE MERCADORIA</p>
          <h2>Recebimento de mercadorias</h2>
          <p>
            Conferência de fornecedores, produtos, quantidades e custos de entrada.
          </p>
        </div>
      </div>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">DOCUMENTO</p>
            <h3>Dados do recebimento</h3>
          </div>
        </div>

        <div className="estoque-form-grid">
          <div className="form-group estoque-grow">
            <label>Fornecedor</label>
            <select
              value={fornecedorId}
              onChange={(e) => setFornecedorId(e.target.value)}
            >
              <option value="">Selecione...</option>

              {fornecedores.map((fornecedor) => (
                <option key={fornecedor.id} value={fornecedor.id}>
                  {fornecedor.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Nº documento / NF</label>
            <input
              value={numeroDocumento}
              onChange={(e) => setNumeroDocumento(e.target.value)}
              placeholder="Ex.: NF 000123"
            />
          </div>

          <div className="form-group estoque-grow">
            <label>Observação</label>
            <input
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: entrega conferida sem divergências"
            />
          </div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">PRODUTOS</p>
            <h3>Itens recebidos</h3>
          </div>
        </div>

        <div className="estoque-form-grid">
          <div className="form-group estoque-grow">
            <label>Produto</label>
            <select
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
            >
              <option value="">Selecione...</option>

              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} — {produto.codigo_barras || produto.plu || 's/c'}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantidade</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label>Custo unitário</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={custoUnitario}
              onChange={(e) => setCustoUnitario(e.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="form-group">
            <label>Lote</label>
            <input
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              placeholder="Ex.: L240901"
            />
          </div>

          <div className="form-group">
            <label>Validade</label>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={adicionarItem}
          >
            + Adicionar
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Código / PLU</th>
                <th>Un.</th>
                <th>Qtd.</th>
                <th>Custo</th>
                <th>Lote</th>
                <th>Validade</th>
                <th>Subtotal</th>
                <th>Ação</th>
              </tr>
            </thead>

            <tbody>
              {!itens.length ? (
                <tr>
                  <td colSpan="9">Nenhum produto adicionado.</td>
                </tr>
              ) : (
                itens.map((item) => (
                  <tr key={item.produtoId}>
                    <td>{item.nome}</td>
                    <td>{item.codigo}</td>
                    <td>{item.unidade}</td>
                    <td>{item.quantidade}</td>
                    <td>{moeda(item.custoUnitario)}</td>
                    <td>{item.lote || '-'}</td>
                    <td>
                      {item.validade
                        ? new Date(item.validade + 'T12:00:00').toLocaleDateString('pt-BR')
                        : '-'}
                    </td>
                    <td>
                      {moeda(
                        Number(item.quantidade) *
                          Number(item.custoUnitario || 0)
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => removerItem(item)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="panel-header">
          <strong>Total da entrada: {moeda(total)}</strong>

          <button
            type="button"
            className="primary-button"
            disabled={salvando || !itens.length}
            onClick={registrarRecebimento}
          >
            {salvando ? 'Registrando...' : 'Confirmar recebimento'}
          </button>
        </div>
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">HISTÓRICO</p>
            <h3>Últimos recebimentos</h3>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={carregarHistorico}
          >
            Atualizar
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Data</th>
                <th>Fornecedor</th>
                <th>Documento</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {!historico.length ? (
                <tr>
                  <td colSpan="5">Nenhum recebimento registrado.</td>
                </tr>
              ) : (
                historico.map((recebimento) => (
                  <tr key={recebimento.id}>
                    <td>{recebimento.id}</td>
                    <td>{dataHora(recebimento.criado_em)}</td>
                    <td>{recebimento.fornecedor_nome || '-'}</td>
                    <td>{recebimento.numero_documento || '-'}</td>
                    <td>{recebimento.status}</td>
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
