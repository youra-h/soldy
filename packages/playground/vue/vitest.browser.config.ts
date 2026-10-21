import { defineConfig } from 'vitest/config'
import type { BrowserCommandContext } from 'vitest/node'
import { defineBrowserCommand, playwright } from '@vitest/browser-playwright'
import { aliases, constants, plugins } from './vite.base.ts'

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

/** Точка в долях рамки узла: `x` — по ширине, `y` — по высоте. */
type TFraction = { x: number; y: number }

/**
 * Протяжка мышью без паузы перед отпусканием: нажать в точке `from`, довести
 * до `to` и сразу отпустить. Движение и отпускание уходят в браузер одним
 * тактом процесса прогона — событиями мыши протокола DevTools
 * (`Input.dispatchMouseEvent`) одной сессии, а их браузер выполняет по
 * порядку. У `dragAndDrop` между ними круг RPC, а под нагрузкой — и простой
 * процесса прогона: окно, которое жест держит по часам (стоянка ручки на
 * метке — 250 мс, `browser/slider.spec.ts`), кончалось до отпускания.
 * Одновременные вызовы `page.mouse` порядка не обещают — отпускание обгоняло
 * движение. Кнопку Playwright не нажимает, и его состояние мыши с браузером не
 * расходится. Узел — селектор CSS в рамке теста, рамку страницы считает
 * Playwright.
 */
const quickDrag = defineBrowserCommand<[selector: string, from: TFraction, to: TFraction]>(
	async ({ page, frame }, selector, from, to) => {
		const box = await (await frame()).locator(selector).boundingBox()

		if (!box) throw new Error(`${selector}: узла нет или он не нарисован`)

		const point = ({ x, y }: TFraction) => ({
			x: box.x + box.width * x,
			y: box.y + box.height * y,
		})
		const session = await page.context().newCDPSession(page)
		const left = { button: 'left', clickCount: 1 } as const

		try {
			await session.send('Input.dispatchMouseEvent', {
				type: 'mousePressed',
				...point(from),
				...left,
				buttons: 1,
			})
			await Promise.all([
				session.send('Input.dispatchMouseEvent', {
					type: 'mouseMoved',
					...point(to),
					button: 'left',
					buttons: 1,
				}),
				session.send('Input.dispatchMouseEvent', {
					type: 'mouseReleased',
					...point(to),
					...left,
					buttons: 0,
				}),
			])
		} finally {
			await session.detach()
		}
	},
)

/**
 * Пауза от прошлого касания, после которой касание уже не второе в двойном.
 * Двойное касание браузер разбирает иначе — выделяет слово и открывает
 * контекстное меню, — а касание следующего теста шло за касанием прошлого
 * быстрее окна Chromium (оно короче 350 мс).
 */
const DOUBLE_TAP_PAUSE = 500

/** Когда кончилось прошлое касание — по часам процесса прогона. */
let lastTap = 0

/** Точка касания — в координатах страницы. */
type TTouchPoint = { x: number; y: number }

/** Событие касания протокола DevTools: `touchEnd` точек не несёт. */
type TTouchEvent = {
	type: 'touchStart' | 'touchMove' | 'touchEnd'
	touchPoints: TTouchPoint[]
}

/**
 * Палец — событиями касания протокола DevTools (`Input.dispatchTouchEvent`).
 * `userEvent` касаться не умеет, а `touchscreen` Playwright требует контекста
 * с `hasTouch` — он сменил бы устройство всем браузерным спекам. Касание
 * протокола браузер разбирает как настоящее: `pointerdown` с
 * `pointerType: 'touch'`, фокус и каретка в редактируемом узле, `click` — всё
 * от одного жеста (`browser/date-input.spec.ts`, «сенсорный режим»). Узел —
 * селектором CSS в рамке теста, точку страницы — центр узла — считает
 * Playwright, а события от неё строит команда (`events`).
 *
 * Окно двойного касания у команд общее: с касанием прошлой команды касание
 * этой двойного не составит — команда выжидает паузу от него. Протяжка тоже
 * его выжидает: протяжка сразу после касания — двойное касание с протяжкой, то
 * есть масштаб.
 */
async function touch(
	{ page, frame }: BrowserCommandContext,
	selector: string,
	events: (point: TTouchPoint) => TTouchEvent[],
): Promise<void> {
	const box = await (await frame()).locator(selector).boundingBox()

	if (!box) throw new Error(`${selector}: узла нет или он не нарисован`)

	const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
	const pause = lastTap + DOUBLE_TAP_PAUSE - Date.now()
	const session = await page.context().newCDPSession(page)

	try {
		if (pause > 0) await page.waitForTimeout(pause)

		for (const event of events(point)) {
			await session.send('Input.dispatchTouchEvent', event)
		}
	} finally {
		lastTap = Date.now()
		await session.detach()
	}
}

/**
 * Касание пальцем — в центре узла: `touchStart` и `touchEnd`. Касаний `count`
 * подряд, без пауз между ними: два — двойное касание.
 */
const tap = defineBrowserCommand<[selector: string, count?: number]>(
	(context, selector, count = 1) =>
		touch(context, selector, (point) =>
			Array.from({ length: count }, (): TTouchEvent[] => [
				{ type: 'touchStart', touchPoints: [point] },
				{ type: 'touchEnd', touchPoints: [] },
			]).flat(),
		),
)

/**
 * Протяжка пальцем — от центра узла на `dx`, `dy`: `touchStart`, `touchMove`
 * равными шагами (`steps`) и `touchEnd` в последней точке. Жест смахивания
 * (`browser/drawer.spec.ts`, «пальцем»): касание, в отличие от мыши, браузер
 * сам захватывает за узлом под пальцем и забирает под прокрутку.
 */
const touchDrag = defineBrowserCommand<[selector: string, dx: number, dy: number, steps?: number]>(
	(context, selector, dx, dy, steps = 10) =>
		touch(context, selector, ({ x, y }) => [
			{ type: 'touchStart', touchPoints: [{ x, y }] },
			...Array.from({ length: steps }, (_, index): TTouchEvent => ({
				type: 'touchMove',
				touchPoints: [
					{ x: x + (dx * (index + 1)) / steps, y: y + (dy * (index + 1)) / steps },
				],
			})),
			{ type: 'touchEnd', touchPoints: [] },
		]),
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
 * `npm run test:layout` делает это сам. Плагины, константы и алиасы — общие
 * с остальными конфигами стенда (`vite.base.ts`).
 */
export default defineConfig({
	plugins: plugins(),
	define: constants(),
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
			commands: { mouseDown, mouseUp, quickDrag, tap, touchDrag, insertText, compose },
		},
	},
	resolve: {
		alias: aliases({ themeCss: true }),
	},
})
