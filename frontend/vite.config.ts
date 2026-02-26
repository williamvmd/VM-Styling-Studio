import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/-Nano-Banana-Pro-AI-Powered-Visual-Merchandising-Styling-Engine/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  define: {
    'process.env': {}
  }
})
