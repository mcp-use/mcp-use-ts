import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  external: [
    'vite',
    '@vitejs/plugin-react',
    'esbuild'
  ],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: false,
  shims: false,
  bundle: true,
})

