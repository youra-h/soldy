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
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (content: string) => {
          const importLine = `@import "${path.resolve(__dirname, '../../themes/oren/src/base.css')}";\n`
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
