import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  resolve: {
    alias: {
      '@soldy/accessor': path.resolve(__dirname, '../../accessor'),
      '@soldy/core': path.resolve(__dirname, '../../core/src'),
      '@soldy/icons': path.resolve(__dirname, '../../icons/src'),
      '@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
      '@soldy/setup': path.resolve(__dirname, '../../setup'),
    },
  },
  build: {
    outDir: '../dist',
  },
})
