import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    open: true,
    proxy: {
      '/api/gemini': {
        target: 'https://wuaiapi.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/gemini/, '')
      }
    }
  },
  define: {
    'process.env': {}
  }
})
