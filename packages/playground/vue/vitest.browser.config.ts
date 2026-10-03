import { defineConfig } from 'vitest/config'
import { defineBrowserCommand, playwright } from '@vitest/browser-playwright'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

/**
 * Кнопка мыши отдельно от движения. `userEvent` жмёт и отпускает её только
 * вместе с движением (`click`, `dragAndDrop`), а жесту бывает нужна пауза с
 * зажатой кнопкой — стоянка ручки ползунка на метке
 * (`browser/slider.spec.ts`). Двигает мышь по-прежнему `userEvent.hover`: он
 * и переводит точку из рамки теста в координаты страницы. Типы команд —
 * `browser/commands.d.ts`.
 */
const mouseDown = defineBrowserCommand(async ({ page }) => {
	await page.mouse.down()
})

const mouseUp = defineBrowserCommand(async ({ page }) => {
	await page.mouse.up()
})

/**
 * Пауза от прошлого касания, после которой касание уже не второе в двойном.
 * Двойное касание браузер разбирает иначе — выделяет слово и открывает
 * контекстное меню, — а касание следующего теста шло за касанием прошлого
 * быстрее окна Chromium (оно короче 350 мс).
 */
const DOUBLE_TAP_PAUSE = 500

/** Когда кончилось прошлое касание — по часам процесса прогона. */
let lastTap = 0

/**
 * Касание пальцем — в центре узла: `touchStart` и `touchEnd` протокола
 * DevTools. `userEvent` касаться не умеет, а `touchscreen` Playwright требует
 * контекста с `hasTouch` — он сменил бы устройство всем браузерным спекам.
 * Касание протокола браузер разбирает как настоящее: `pointerdown` с
 * `pointerType: 'touch'`, фокус и каретка в редактируемом узле, `click` — всё
 * от одного жеста (`browser/date-input.spec.ts`, «сенсорный режим»). Узел —
 * селектором CSS в рамке теста, точку страницы считает Playwright. Касаний
 * `count` подряд, без пауз между ними: два — двойное касание. С касанием
 * прошлой команды первое двойного не составит: команда выжидает паузу от него.
 */
const tap = defineBrowserCommand<[selector: string, count?: number]>(
	async ({ page, frame }, selector, count = 1) => {
		const box = await (await frame()).locator(selector).boundingBox()

		if (!box) throw new Error(`${selector}: узла нет или он не нарисован`)

		const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
		const pause = lastTap + DOUBLE_TAP_PAUSE - Date.now()
		const session = await page.context().newCDPSession(page)

		try {
			if (pause > 0) await page.waitForTimeout(pause)

			for (let index = 0; index < count; index++) {
				await session.send('Input.dispatchTouchEvent', {
					type: 'touchStart',
					touchPoints: [point],
				})
				await session.send('Input.dispatchTouchEvent', {
					type: 'touchEnd',
					touchPoints: [],
				})
			}
		} finally {
			lastTap = Date.now()
			await session.detach()
		}
	},
)

/**
 * Текст без клавиш — так его вставляет экранная клавиатура или IME:
 * `beforeinput` (`insertText`) и `input`, без `keydown`. Незавершённую
 * композицию он же завершает.
 */
const insertText = defineBrowserCommand(async ({ page }, text: string) => {
	await page.keyboard.insertText(text)
})

/**
 * Текст незавершённой композиции IME — `compositionstart`, `compositionupdate`
 * и `insertCompositionText`, которые не отменить. Завершает её `insertText`.
 */
const compose = defineBrowserCommand(async ({ page }, text: string) => {
	const session = await page.context().newCDPSession(page)

	try {
		await session.send('Input.imeSetComposition', {
			text,
			selectionStart: text.length,
			selectionEnd: text.length,
		})
	} finally {
		await session.detach()
	}
})

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
			commands: { mouseDown, mouseUp, tap, insertText, compose },
		},
	},
	resolve: {
		alias: {
			// Раньше корня пакета: алиас сравнивается префиксом
			'@soldy-ui/theme-oren/setup': path.resolve(
				import.meta.dirname,
				'../../themes/oren/setup/index.ts',
			),
			'@soldy-ui/theme-oren': path.resolve(
				import.meta.dirname,
				'../../themes/oren/dist/index.css',
			),
			'@soldy-ui/core': path.resolve(import.meta.dirname, '../../core/src'),
			'@soldy-ui/icons-material': path.resolve(
				import.meta.dirname,
				'../../icons/material/src',
			),
			'@soldy-ui/plugins': path.resolve(import.meta.dirname, '../../plugins/src'),
			'@soldy-ui/setup': path.resolve(import.meta.dirname, '../../setup/index.ts'),
			'@soldy-ui/vue': path.resolve(import.meta.dirname, '../../ui/vue/src/index.ts'),
			'@soldy-ui/playground-shared': path.resolve(
				import.meta.dirname,
				'../shared/src/index.ts',
			),
		},
	},
})
