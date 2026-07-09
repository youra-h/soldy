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
      '@soldy/foundation/tailwind': path.resolve(__dirname, '../../foundation/src/tailwind/index.css'),
      '@soldy/core': path.resolve(__dirname, '../../core/src'),
      '@soldy/foundation': path.resolve(__dirname, '../../foundation/src'),
      '@soldy/icons': path.resolve(__dirname, '../../icons/src'),
      '@soldy/plugins': path.resolve(__dirname, '../../plugins/src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (content: string) => {
          const importLine = `@import "${path.resolve(__dirname, '../../foundation/src/tailwind/index.css')}";\n`
          const matches = [...content.matchAll(/^@use\s+[^;]+;\s*\n/gm)]
          if (matches.length > 0) {
            const last = matches[matches.length - 1]
            const end = (last.index ?? 0) + last[0].length
            return content.slice(0, end) + importLine + content.slice(end)
          }
          return importLine + content
        },
      },
    },
  },
  build: {
    outDir: '../dist',
  },
})
