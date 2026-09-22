import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Configuração compatível com navegador e Electron.
// O caminho relativo permite carregar os assets via file://
export default defineConfig({
  base: './',
  plugins: [react()],
})
