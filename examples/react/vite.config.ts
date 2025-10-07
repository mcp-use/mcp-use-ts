import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      'mcp-use/browser': resolve(__dirname, '../../dist/src/browser.js'),
      'mcp-use': resolve(__dirname, '../../dist/src'),
    }
  },
  define: {
    global: 'globalThis',
    'process.env.DEBUG': 'undefined',
    'process.env.MCP_USE_ANONYMIZED_TELEMETRY': 'undefined',
    'process.env.MCP_USE_TELEMETRY_SOURCE': 'undefined',
    'process.env.MCP_USE_LANGFUSE': 'undefined',
    'process.platform': '""',
    'process.version': '""',
    'process.argv': '[]',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  }
})
