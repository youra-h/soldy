import { defineConfig } from 'vitest/config'
import { aliases, plugins } from './vite.base.ts'

/**
 * Тесты стенда — дымовые: он существует ради того, чтобы дёргать компоненты, и
 * молча сломавшаяся страница обесценивает его целиком. Тему сюда не тянем: она
 * отдаёт CSS, а в jsdom стилей всё равно нет — то, что нужно проверять по
 * раскладке, живёт в `vitest.browser.config.ts`.
 */
export default defineConfig({
	plugins: plugins(),
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
		alias: aliases({ themeCss: false }),
	},
})
