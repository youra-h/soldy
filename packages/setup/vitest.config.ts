import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Тесты ходят в соседей и в сам пакет **исходниками**, а не сборкой: правка в
 * ядре обязана быть видна без промежуточного билда. Через манифест и пакет, и
 * соседи разрешились бы в `dist`, которого в чистом клоне нет.
 *
 * Окружение по умолчанию — `node`: спеки с DOM просят jsdom первой строкой
 * (`// @vitest-environment jsdom`), и общего окружения у пакета нет.
 */
export default defineConfig({
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../core/src'),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, 'index.ts'),
		},
	},
	test: {
		include: ['__tests__/**/*.{test,spec}.ts'],
	},
})
