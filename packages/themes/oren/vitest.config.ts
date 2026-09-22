import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Тесты ходят в соседей **исходниками**, а не сборкой: правка в ядре обязана
 * быть видна без промежуточного билда. Через манифест сосед разрешился бы в
 * `dist`, которого в чистом клоне нет.
 *
 * Конфиг отдельный от `vite.config.ts`: тот собирает CSS темы, и к тестам его
 * препроцессор отношения не имеет — SCSS они читают файлами.
 */
export default defineConfig({
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
		},
	},
	test: {
		include: ['__tests__/**/*.{test,spec}.ts'],
	},
})
