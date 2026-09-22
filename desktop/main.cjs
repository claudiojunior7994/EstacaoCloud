const { app, BrowserWindow, dialog } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

let janelaPrincipal = null
let processoBackend = null

function caminhoFrontend() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar')
  }

  return path.join(__dirname, '..')
}

function caminhoBackend() {
  if (app.isPackaged) {
    return path.join(
      process.resourcesPath,
      'app.asar.unpacked',
    )
  }

  return path.join(__dirname, '..')
}

function iniciarBackend() {
  const raizBackend = caminhoBackend()

  const caminhoBackendArquivo = path.join(
    raizBackend,
    'backend',
    'server.js',
  )

  processoBackend = spawn(
    process.execPath,
    [caminhoBackendArquivo],
    {
      cwd: path.dirname(caminhoBackendArquivo),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: '3000',
      },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  processoBackend.stdout.on('data', (dados) => {
    console.log(`[BACKEND] ${dados}`)
  })

  processoBackend.stderr.on('data', (dados) => {
    console.error(`[BACKEND] ${dados}`)
  })

  processoBackend.on('error', (erro) => {
    dialog.showErrorBox(
      'EstacaoCloud',
      `Não foi possível iniciar o servidor interno.\n\n${erro.message}`,
    )
  })
}

function apiDisponivel() {
  return new Promise((resolve) => {
    const requisicao = http.get(
      'http://127.0.0.1:3000/api/health',
      (resposta) => {
        resposta.resume()
        resolve(true)
      },
    )

    requisicao.setTimeout(1000)

    requisicao.on('timeout', () => {
      requisicao.destroy()
      resolve(false)
    })

    requisicao.on('error', () => {
      resolve(false)
    })
  })
}

async function aguardarBackend() {
  const tentativas = 30

  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    if (await apiDisponivel()) {
      return true
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 500)
    })
  }

  return false
}

function criarJanela() {
  janelaPrincipal = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08111f',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const raizFrontend = caminhoFrontend()

  const arquivoFrontend = path.join(
    raizFrontend,
    'frontend',
    'dist',
    'index.html',
  )

  janelaPrincipal.loadFile(arquivoFrontend)

  janelaPrincipal.webContents.on(
    'did-fail-load',
    (
      event,
      errorCode,
      errorDescription,
      validatedURL,
    ) => {
      console.error(
        'ERRO AO CARREGAR FRONTEND:',
        errorCode,
        errorDescription,
        validatedURL,
      )
    },
  )

  janelaPrincipal.once('ready-to-show', () => {
    janelaPrincipal.show()
  })

  janelaPrincipal.on('closed', () => {
    janelaPrincipal = null
  })
}

app.whenReady().then(async () => {
  iniciarBackend()

  const backendPronto = await aguardarBackend()

  if (!backendPronto) {
    dialog.showErrorBox(
      'EstacaoCloud',
      'O servidor interno do EstacaoCloud não iniciou corretamente.',
    )

    app.quit()
    return
  }

  criarJanela()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      criarJanela()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (processoBackend && !processoBackend.killed) {
    processoBackend.kill()
  }
})
