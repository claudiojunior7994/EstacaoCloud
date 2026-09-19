const fs = require('fs')

const arquivo = 'src/App.jsx'
let codigo = fs.readFileSync(arquivo, 'utf8')

function trocar(exato, novo, nome) {
  const partes = codigo.split(exato)

  if (partes.length !== 2) {
    console.error(`ERRO: "${nome}" apareceu ${partes.length - 1} vez(es).`)
    console.error('PATCH CANCELADO.')
    process.exit(1)
  }

  codigo = partes.join(novo)
  console.log(`OK: ${nome}`)
}

/* 1 - estado inicial do produto */
trocar(
`    precoVenda: '',
    estoque: '',`,
`    precoVenda: '',
    clubeAtivo: false,
    precoClube: '',
    estoque: '',`,
'estado Clube do produto'
)

/* 2 - carregar produtos da API */
trocar(
`            precoVenda: Number(produto.preco || 0),
            estoque: Number(produto.estoque || 0),`,
`            precoVenda: Number(produto.preco || 0),
            clubeAtivo: Boolean(produto.clubeAtivo ?? produto.clube_ativo),
            precoClube:
              produto.precoClube ?? produto.preco_clube ?? '',
            estoque: Number(produto.estoque || 0),`,
'carregamento do preço Clube'
)

/* 3 - checkbox no formulário */
trocar(
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
'checkbox Clube'
)

/* 4 - validação antes de salvar */
trocar(
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
'validação do preço Clube'
)

/* 5 - enviar Clube para API */
trocar(
`      preco: Number(novoProduto.precoVenda || 0),
      estoque: Number(novoProduto.estoque || 0),`,
`      preco: Number(novoProduto.precoVenda || 0),
      clubeAtivo: Boolean(novoProduto.clubeAtivo),
      precoClube: novoProduto.clubeAtivo
        ? Number(novoProduto.precoClube)
        : null,
      estoque: Number(novoProduto.estoque || 0),`,
'payload Clube'
)

/* 6 - produto retornado pela API */
trocar(
`        precoVenda: Number(dados.produto.preco || 0),
        estoque: Number(dados.produto.estoque || 0),`,
`        precoVenda: Number(dados.produto.preco || 0),
        clubeAtivo: Boolean(
          dados.produto.clubeAtivo ?? dados.produto.clube_ativo
        ),
        precoClube:
          dados.produto.precoClube ??
          dados.produto.preco_clube ??
          '',
        estoque: Number(dados.produto.estoque || 0),`,
'retorno da API'
)

/* 7 - editar produto existente */
trocar(
`      precoVenda: String(produto.precoVenda ?? produto.preco ?? ''),
      estoque: String(produto.estoque ?? ''),`,
`      precoVenda: String(produto.precoVenda ?? produto.preco ?? ''),
      clubeAtivo: Boolean(
        produto.clubeAtivo ?? produto.clube_ativo
      ),
      precoClube: String(
        produto.precoClube ?? produto.preco_clube ?? ''
      ),
      estoque: String(produto.estoque ?? ''),`,
'edição do produto Clube'
)

/* 8 - campos visuais no formulário */
trocar(
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
'campos visuais Clube'
)

/* validação final */
const obrigatorios = [
  'clubeAtivo: false',
  'precoClube:',
  'Produto participa do Clube Estação',
  'Informe um preço válido para o Clube Estação.',
  'clubeAtivo: Boolean(novoProduto.clubeAtivo)',
]

for (const trecho of obrigatorios) {
  if (!codigo.includes(trecho)) {
    console.error(`ERRO NA VALIDAÇÃO: ${trecho}`)
    process.exit(1)
  }
}

fs.writeFileSync(arquivo, codigo, 'utf8')

console.log('')
console.log('APP.JSX ALTERADO COM SUCESSO')
