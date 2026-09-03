import { defineConfig } from 'vite'
import path from 'node:path'

/**
 * Сборка темы: SCSS-исходники компилируются в единый dist/index.css.
 *
 * В SCSS-вход инжектируется @import base.css (tailwind + токены + утилиты),
 * чтобы @apply в компонентных стилях корректно развернулся через
 * @tailwindcss/postcss.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.scss'),
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        assetFileNames: 'index.css',
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: (content: string) => {
          const importLine = `@import "${path.resolve(__dirname, 'src/base.css')}";\n`
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
})
