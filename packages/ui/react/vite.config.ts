import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      '@soldy/foundation/tailwind': path.resolve(__dirname, '../../foundation/src/tailwind/index.css'),
      '@soldy/core': path.resolve(__dirname, '../../core/src'),
      '@soldy/foundation': path.resolve(__dirname, '../../foundation/src'),
      '@soldy/icons': path.resolve(__dirname, '../../icons/src'),
      '@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
    },
  },
  build: {
    outDir: '../dist',
  },
})
