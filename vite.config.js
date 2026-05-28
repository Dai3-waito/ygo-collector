import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
      '/api/ygo-prints': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: (path) => {
          const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
          return `/api/v7/cardinfo.php${query}`
        },
      },
    },
  },
})
