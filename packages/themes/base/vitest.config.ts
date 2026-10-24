import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Тесты базы — сторожа CSS: свои, по исходникам базы, и общие для любой темы,
 * по собранному CSS каждой темы репозитория (`__tests__/themes.ts`), — и спеки
 * плагинов раскладки (`setup/`). Тему помощник собирает её собственным
 * конфигом, а плагины ходят в соседей **исходниками**, как тесты остальных
 * пакетов: через манифест сосед разрешился бы в `dist`, которого в чистом клоне
 * нет.
 */
export default defineConfig({
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
		},
	},
	test: {
		include: ['__tests__/**/*.{test,spec}.ts'],
	},
})
