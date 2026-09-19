const fs = require('fs')

const arquivo = 'src/App.jsx'
const original = fs.readFileSync(arquivo, 'utf8')
let codigo = original

function trocarExatamente(exato, novo, quantidade, nome) {
  const ocorrencias = codigo.split(exato).length - 1

  if (ocorrencias !== quantidade) {
    console.error(
      `ERRO: "${nome}" deveria aparecer ${quantidade} vez(es), mas apareceu ${ocorrencias}.`
    )
    console.error('NENHUMA ALTERAÇÃO FOI SALVA.')
    process.exit(1)
  }

  codigo = codigo.split(exato).join(novo)
  console.log(`OK: ${nome} (${quantidade}x)`)
}

/* 1 - estado inicial */
trocarExatamente(
`    precoVenda: '',
    estoque: '',`,
`    precoVenda: '',
    clubeAtivo: false,
    precoClube: '',
    estoque: '',`,
1,
'estado Clube'
)

/* 2 - existem propositalmente DOIS carregamentos de produtos */
trocarExatamente(
`            precoVenda: Number(produto.preco || 0),
            estoque: Number(produto.estoque || 0),`,
`            precoVenda: Number(produto.preco || 0),
            clubeAtivo: Boolean(
              produto.clubeAtivo ?? produto.clube_ativo
            ),
            precoClube:
              produto.precoClube ??
              produto.preco_clube ??
              '',
            estoque: Number(produto.estoque || 0),`,
2,
'mapeamento Clube dos produtos'
)

/* 3 - checkbox */
trocarExatamente(
`    const { name, value } = evento.target

    setNovoProduto((produtoAtual) => ({
      ...produtoAtual,
      [name]: value,
    }))`,
`    const { name, value, type, checked } = evento.target

    setNovoProduto((produtoAtual) => ({
      ...produtoAtual,
      [name]: type === 'checkbox' ? checked : value,
    }))`,
1,
'controle checkbox'
)

/* 4 - validação */
trocarExatamente(
`      alert('Preencha pelo menos nome, preço de venda e estoque.')
      return
    }

    const payload = {`,
`      alert('Preencha pelo menos nome, preço de venda e estoque.')
      return
    }

    if (
      novoProduto.clubeAtivo &&
      (
        novoProduto.precoClube === '' ||
        !Number.isFinite(Number(novoProduto.precoClube)) ||
        Number(novoProduto.precoClube) < 0
      )
    ) {
      alert('Informe um preço válido para o Clube Estação.')
      return
    }

    const payload = {`,
1,
'validação preço Clube'
)

/* 5 - payload */
trocarExatamente(
`      preco: Number(novoProduto.precoVenda || 0),
      estoque: Number(novoProduto.estoque || 0),`,
`      preco: Number(novoProduto.precoVenda || 0),
      clubeAtivo: Boolean(novoProduto.clubeAtivo),
      precoClube: novoProduto.clubeAtivo
        ? Number(novoProduto.precoClube)
        : null,
      estoque: Number(novoProduto.estoque || 0),`,
1,
'payload Clube'
)

/* 6 - resposta ao salvar */
trocarExatamente(
`        precoVenda: Number(dados.produto.preco || 0),
        estoque: Number(dados.produto.estoque || 0),`,
`        precoVenda: Number(dados.produto.preco || 0),
        clubeAtivo: Boolean(
          dados.produto.clubeAtivo ??
          dados.produto.clube_ativo
        ),
        precoClube:
          dados.produto.precoClube ??
          dados.produto.preco_clube ??
          '',
        estoque: Number(dados.produto.estoque || 0),`,
1,
'resposta API'
)

/* 7 - edição */
trocarExatamente(
`      precoVenda: String(produto.precoVenda ?? produto.preco ?? ''),
      estoque: String(produto.estoque ?? ''),`,
`      precoVenda: String(produto.precoVenda ?? produto.preco ?? ''),
      clubeAtivo: Boolean(
        produto.clubeAtivo ?? produto.clube_ativo
      ),
      precoClube: String(
        produto.precoClube ??
        produto.preco_clube ??
        ''
      ),
      estoque: String(produto.estoque ?? ''),`,
1,
'edição produto Clube'
)

/* 8 - interface */
trocarExatamente(
`          <div className="form-group">
            <label htmlFor="estoque">Estoque atual *</label>`,
`          <div className="form-group">
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '24px',
              }}
            >
              <input
                name="clubeAtivo"
                type="checkbox"
                checked={Boolean(novoProduto.clubeAtivo)}
                onChange={alterarCampoProduto}
              />
              Produto participa do Clube Estação
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="precoClube">Preço Clube</label>
            <input
              id="precoClube"
              name="precoClube"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={novoProduto.precoClube}
              onChange={alterarCampoProduto}
              disabled={!novoProduto.clubeAtivo}
            />
          </div>

          <div className="form-group">
            <label htmlFor="estoque">Estoque atual *</label>`,
1,
'interface Clube'
)

const obrigatorios = [
  'clubeAtivo: false',
  "precoClube: ''",
  'Produto participa do Clube Estação',
  'Informe um preço válido para o Clube Estação.',
  'clubeAtivo: Boolean(novoProduto.clubeAtivo)',
]

for (const trecho of obrigatorios) {
  if (!codigo.includes(trecho)) {
    console.error(`ERRO NA VALIDAÇÃO FINAL: ${trecho}`)
    console.error('NENHUMA ALTERAÇÃO FOI SALVA.')
    process.exit(1)
  }
}

fs.writeFileSync(arquivo, codigo, 'utf8')

console.log('')
console.log('APP.JSX PATCH CONCLUÍDO')
