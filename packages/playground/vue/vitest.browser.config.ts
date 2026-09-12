import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Прогон в настоящем браузере — для того, что jsdom не считает вовсе.
 *
 * Дымовые тесты стенда живут в `vitest.config.ts` и обходятся jsdom: им важна
 * разметка, а не её раскладка. Но раскладку — flex, ширины, переносы — jsdom не
 * вычисляет в принципе: `getBoundingClientRect()` там всегда нули. Из-за этого
 * баг «в `multiple` input Select уезжает под теги» не ловился ни одним из 175
 * зелёных тестов адаптера: ломалась не разметка, а результат расчёта.
 *
 * Отдельный конфиг, а не флаг в общем: браузерный прогон на порядок дороже, и
 * гонять в нём дымовые тесты незачем. Тема здесь, в отличие от jsdom-конфига,
 * подключена — проверяем мы именно её CSS, и берётся он собранным
 * (`dist/index.css`), поэтому перед прогоном тему надо собрать. Корневой
 * `npm run test:layout` делает это сам.
 */
export default defineConfig({
	plugins: [vue()],
	test: {
		name: 'layout',
		include: ['browser/**/*.spec.ts'],
		setupFiles: ['./__tests__/setup.ts'],
		browser: {
			enabled: true,
			headless: true,
			// `channel: 'chrome'` — системный браузер вместо того, который
			// Playwright возит с собой: его загрузчик рвётся на 30-секундном
			// лимите (архив 205 МБ), а Chrome на машине уже стоит и обновляется
			// сам. Для проверки раскладки разницы нет, движок тот же Blink.
			// Уберёшь — Playwright потребует `playwright install chromium`.
			provider: playwright({ launchOptions: { channel: 'chrome' } }),
			instances: [{ browser: 'chromium' }],
		},
	},
	resolve: {
		alias: {
			'@soldy/theme-oren': path.resolve(
				import.meta.dirname,
				'../../themes/oren/dist/index.css',
			),
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
