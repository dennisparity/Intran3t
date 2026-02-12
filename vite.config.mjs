import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',  // Use relative paths for IPFS/DotNS deployment
  root: './',
  build: {
    outDir: 'dist',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/dotid': {
        target: 'https://dotid.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dotid/, '/api/directory')
      }
    }
  }
})
