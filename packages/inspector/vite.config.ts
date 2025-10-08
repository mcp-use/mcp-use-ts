import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/inspector/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'mcp-use/react': path.resolve(__dirname, '../mcp-use/dist/src/react/index.js'),
    },
  },
  define: {
    // Define process.env for browser compatibility
    'process.env': {},
  },
  optimizeDeps: {
    include: ['mcp-use/react'],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist/client',
  },
})
