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
    'process.env': {},
    'process.browser': true,
    'process.version': '"v18.0.0"',
    'process.platform': '"browser"',
    'process.nextTick': 'setTimeout',
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
    include: [
      'react', 
      'react-dom', 
      '@solana/web3.js', 
      'buffer', 
      'process',
      'crypto-browserify',
      'stream-browserify',
      'util',
      'readable-stream',
      'events',
      'path-browserify',
      'os-browserify'
    ],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process',
      util: 'util',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      events: 'events',
      path: 'path-browserify',
      os: 'os-browserify',
      'readable-stream': 'readable-stream',
    },
  },
}))
