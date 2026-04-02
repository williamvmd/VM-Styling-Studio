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
        target: 'http://zx2.52youxi.cc:3000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/gemini/, '')
      }
    }
  },
  define: {
    'process.env': {}
  }
})
