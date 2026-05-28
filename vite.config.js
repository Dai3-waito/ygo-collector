import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { neuronApiDevPlugin } from './vite-neuron-api.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), neuronApiDevPlugin()],
  server: {
    proxy: {
      '/api/ygo-search': {
        target: 'https://ygocdb.com',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
          const q = new URLSearchParams(query.replace(/^\?/, ''))
          const search = q.get('search') ?? q.get('fname') ?? ''
          const start = q.get('start') ?? q.get('offset') ?? '0'
          return `/api/v0/?search=${encodeURIComponent(search)}&start=${start}`
        },
      },
      '/api/ygo-prodeck-search': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
          return `/api/v7/cardinfo.php${query}`
        },
      },
      '/api/ygo-prints': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
          return `/api/v7/cardinfo.php${query}`
        },
      },
      '/api/ygo-cardsets': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: () => '/api/v7/cardsets.php',
      },
      '/api/ygo-setinfo': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
          return `/api/v7/cardsetsinfo.php${query}`
        },
      },
    },
  },
})
