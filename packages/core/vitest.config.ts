import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@soldy/core': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['__tests__/**/*.{test,spec}.ts'],
  },
})
