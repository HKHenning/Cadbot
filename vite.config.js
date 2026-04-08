import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const wasmContentTypePlugin = {
  name: 'wasm-content-type-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url.includes('.wasm')) {
        res.setHeader('Content-Type', 'application/wasm')
      }
      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), wasmContentTypePlugin],
  optimizeDeps: {
    exclude: ['replicad-opencascadejs', 'replicad', 'replicad-threejs-helper'],
  },
  worker: {
    format: 'es',
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
})
