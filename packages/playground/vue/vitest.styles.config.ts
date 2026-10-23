import { appendFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import { defineBrowserCommand, playwright } from '@vitest/browser-playwright'
import { aliases, constants, plugins } from './vite.base.ts'

/**
 * Кусок отчёта — в консоль прогона и, если задан файл, в него. Текст
 * собирает прогон в браузере (`styles-diff/report.ts`); печатать оттуда
 * нечем: консоль страницы в прогон не пересылается.
 */
const stylesReport = defineBrowserCommand<[text: string, out: string]>((_context, text, out) => {
	process.stdout.write(text)

	if (out) appendFileSync(out, text)
})

/**
 * Сравнение вычисленных стилей частей soldy под двумя листами темы —
 * `npm run compare:styles` (`styles-diff/cli.ts`; описание —
 * `packages/playground/AGENTS.md`, «Сравнение стилей»). Прогон, а не тест:
 * свой конфиг и своя папка, `test:layout` его не берёт.
 *
 * Браузер — тот же Chromium Playwright, что у `test:layout`, и полосы
 * прокрутки в нём настоящие (`vitest.browser.config.ts`). Окно широкое: стенд
 * в узком окне перекладывает шапку и меню в выезжающие панели, а сравнивать
 * нужно ту раскладку, в которой он открывается на экране. Темы в алиасах нет:
 * листы «до» и «после» прогон кладёт на страницу сам.
 */
export default defineConfig({
	plugins: plugins(),
	define: constants(),
	test: {
		name: 'styles',
		include: ['styles-diff/**/*.spec.ts'],
		// Заглушки, пакет иконок и поведение темы — как у браузерного прогона
		setupFiles: ['./__tests__/setup.ts'],
		// Журнал колонок печатает экземпляры ядра; отчёт идёт командой
		disableConsoleIntercept: true,
		// Страница — компонент всеми пропами в две колонки, в двух схемах под
		// двумя листами, и у каждой смены листа своё ожидание
		testTimeout: 10 * 60_000,
		browser: {
			enabled: true,
			headless: true,
			provider: playwright({
				launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
			}),
			instances: [{ browser: 'chromium' }],
			viewport: { width: 1440, height: 900 },
			commands: { stylesReport },
		},
	},
	resolve: {
		alias: aliases({ themeCss: false }),
	},
})
