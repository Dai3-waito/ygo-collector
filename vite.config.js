import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/ygo-search': {
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
