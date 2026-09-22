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
 * Здесь же — действия браузера по умолчанию: ввод символа, переключение
 * чекбокса, клик из Enter или пробела на `<button>`. jsdom их тоже не
 * выполняет, поэтому отменённое действие там не видно: корень контрола глушил
 * Enter и пробел вложенных полей и кнопок при зелёных тестах
 * (`browser/keyboard-activation.spec.ts`).
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
		// `__tests__/setup.ts` — общий с jsdom (заглушки и иконки),
		// `browser/setup.ts` — сторож ошибок окна, только для браузера.
		setupFiles: ['./__tests__/setup.ts', './browser/setup.ts'],
		browser: {
			enabled: true,
			headless: true,
			// Браузер — тот, что Playwright возит с собой, закреплённый ревизией
			// в package-lock, а не системный Chrome (`channel: 'chrome'`): тот у
			// каждого своей версии и обновляется сам, и расхождение между машинами
			// выглядело бы плавающим тестом. Перед первым прогоном нужен
			// `npx playwright install chromium`; CI делает это сам и кэширует.
			//
			// Полосы прокрутки в прогоне настоящие. Playwright в headless
			// запускает Chromium с `--hide-scrollbars`: полоса не рисуется и не
			// занимает места, и `innerWidth === documentElement.clientWidth ===
			// visualViewport.width`. Пока три границы совпадают, любой сторож
			// раскладки у края окна пуст — прятаться не подо что, и тест
			// «панель не уехала под полосу» проходит при любой реализации
			// `TAnchorPlugin` (`browser/anchor.spec.ts`, «граница — видимая
			// область»). Возвращать флаг «ради чистоты скриншотов» нельзя:
			// вместе с ним уйдёт и сторож. Прогон остаётся headless — снят
			// ровно один аргумент.
			provider: playwright({
				launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
			}),
			instances: [{ browser: 'chromium' }],
		},
	},
	resolve: {
		alias: {
			// Раньше корня пакета: алиас сравнивается префиксом
			'@soldy/theme-oren/setup': path.resolve(
				import.meta.dirname,
				'../../themes/oren/setup/index.ts',
			),
			'@soldy/theme-oren': path.resolve(
				import.meta.dirname,
				'../../themes/oren/dist/index.css',
			),
			'@soldy/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy/icons-material': path.resolve(import.meta.dirname, '../../icons/material/src'),
			'@soldy/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy/ui-vue': path.resolve(import.meta.dirname, '../../ui/vue/src/index.ts'),
			'@soldy/playground-shared': path.resolve(import.meta.dirname, '../shared/src/index.ts'),
		},
	},
})
