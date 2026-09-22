import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Пакет потребляет исходники соседних воркспейсов напрямую, как это делают
 * тесты остальных пакетов: алиасы вместо сборки.
 *
 * Окружение по умолчанию — node. Спеку с DOM нужна первая строка
 * `// @vitest-environment jsdom`; `pretendToBeVisual` даёт ей
 * `requestAnimationFrame`, на котором ждёт кадра раннер сценариев.
 */
export default defineConfig({
	test: {
		environmentOptions: {
			jsdom: { pretendToBeVisual: true },
		},
	},
	resolve: {
		alias: {
			'@soldy-ui/core': path.resolve(__dirname, '../../core/src'),
			'@soldy-ui/plugins': path.resolve(__dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(__dirname, '../../setup/index.ts'),
		},
	},
})
