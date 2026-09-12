import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Тесты стенда — дымовые: он существует ради того, чтобы дёргать компоненты, и
 * молча сломавшаяся страница обесценивает его целиком. Тему сюда не тянем: она
 * отдаёт CSS, а в jsdom стилей всё равно нет — то, что нужно проверять по
 * раскладке, живёт в `vitest.browser.config.ts`.
 */
export default defineConfig({
	plugins: [vue()],
	test: {
		environment: 'jsdom',
		environmentOptions: {
			jsdom: { pretendToBeVisual: true },
		},
		setupFiles: ['./__tests__/setup.ts'],
		// Явный список, а не умолчание: рядом лежит браузерный прогон
		// (`browser/`), и в jsdom его тестам делать нечего — там нет раскладки,
		// ради которой они написаны.
		include: ['__tests__/**/*.spec.ts'],
	},
	resolve: {
		alias: {
			'@soldy/accessor': path.resolve(import.meta.dirname, '../../accessor'),
			'@soldy/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy/icons-material': path.resolve(import.meta.dirname, '../../icons/material/src'),
			'@soldy/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy/ui-vue': path.resolve(import.meta.dirname, '../../ui/vue/src/index.ts'),
			'@soldy/playground-shared': path.resolve(import.meta.dirname, '../shared/src/index.ts'),
		},
	},
})
