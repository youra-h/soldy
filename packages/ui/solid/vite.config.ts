import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import path from 'node:path'

export default defineConfig({
  plugins: [solid()],
  root: 'demo',
  resolve: {
    alias: {
      '@soldy/theme-oren': path.resolve(__dirname, '../../themes/oren/dist/index.css'),
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
