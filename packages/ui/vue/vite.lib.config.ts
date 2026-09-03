import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Библиотечная сборка @soldy/ui-vue (headless-компоненты, без демо).
 *
 * - Вход: src/index.ts
 * - Форматы: ES + CJS
 * - `vue` и все `@soldy/*` — external (peer-зависимости)
 * - Стили в библиотеке отсутствуют (вынесены в тему), поэтому CSS не эмитится.
 */
export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'lib',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', /^@soldy\//],
    },
  },
})
