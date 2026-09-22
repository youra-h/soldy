import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Тесты ходят в соседей **исходниками**, а не сборкой: правка в ядре обязана
 * быть видна без промежуточного билда. Через манифест сосед разрешился бы в
 * `dist`, которого в чистом клоне нет.
 */
export default defineConfig({
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../core/src'),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, 'src'),
		},
	},
	test: {
		include: ['__tests__/**/*.{test,spec}.ts'],
	},
})
