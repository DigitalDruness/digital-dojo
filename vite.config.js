import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { componentTagger } from 'lovable-tagger'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  esbuild: {
    target: 'esnext',
    format: 'esm',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    esbuildOptions: {
      target: 'esnext',
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
    },
  },
}))
