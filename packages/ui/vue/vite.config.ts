import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import svgLoader from 'vite-svg-loader'
import path from 'node:path'

export default defineConfig({
  plugins: [vue(), vueDevTools(), svgLoader()],
  root: '_demo',
  resolve: {
    alias: {
      '@soldy/theme-oren': path.resolve(__dirname, '../../themes/oren/dist/index.css'),
      '@ui-vue': path.resolve(__dirname, 'src/index.ts'),
      '@soldy/core': path.resolve(__dirname, '../../core/src'),
      '@soldy/icons-material': path.resolve(__dirname, '../../icons/material/src'),
      '@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
      '@soldy/setup': path.resolve(__dirname, '../../setup/index.ts'),
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  build: {
    outDir: '../dist',
  },
})
