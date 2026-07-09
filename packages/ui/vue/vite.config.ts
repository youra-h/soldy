import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import path from 'node:path'

export default defineConfig({
  plugins: [vue(), svgLoader()],
  root: 'demo',
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, 'src/components'),
      '@soldy/core': path.resolve(__dirname, '../../core/src'),
      '@soldy/foundation': path.resolve(__dirname, '../../foundation/src'),
      '@soldy/icons': path.resolve(__dirname, '@soldy/icons/src'),
      '@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  build: {
    outDir: '../dist',
  },
})
