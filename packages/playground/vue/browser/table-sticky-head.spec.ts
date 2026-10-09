/**
 * Закреплённая шапка Table (`stickyHead`) в настоящем браузере: шапка стоит у
 * верхнего края прокрутки, а строки уходят под неё.
 *
 * Свойство и его атрибут проверяют ядро (`core/__tests__/table.spec.ts`) и
 * адаптер (`ui/vue/__tests__/table.spec.ts`), регистрацию плагина высоты —
 * `themes/oren/__tests__/theme-setup.spec.ts`. Закрепляет шапку тема
 * (`themes/oren/src/components/table/_table.scss`), и здесь то, что видно
 * только в браузере: где шапка встаёт — у верха контейнера, на странице под
 * закреплённой полосой приложения, у края тела Dialog и содержимого Popover,
 * — что строки под ней не проступают, фон шапки — поверхность места, линия
 * под ней — цвета рамки `outlined`, ручка ширины и перестановка над соседом
 * работают, фокус после ↑, PageUp и Shift+Tab встаёт ниже шапки, а высоту
 * шапки, по которой его ставит тема, пишет плагин темы.
 *
 * Что строки не проступают и в том, что браузер нарисовал, сверяет снимок
 * шапки (`page.screenshot`): вычисленный стиль и `elementFromPoint` отрисовки
 * не видят.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h, ref, type VNode } from 'vue'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { TSelectionMode, TTableCollection, TTableColumnSource } from '@soldy-ui/core'
import { TABLE_COLUMNS, TABLE_ROWS, TABLE_SCROLL_ROWS } from '@soldy-ui/playground-shared'
import { Button, Dialog, Popover, Table, Virtual } from '@soldy-ui/vue'

import { find, opacity, pixel, settled, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

/**
 * Колонки с подписями в строку: шапка — ровно строка шапки темы, и отступ
 * прокрутки к фокусу у неё верный и без плагина.
 */
const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true, sortable: true }
const CITY: TTableColumnSource = { field: 'city', text: 'Город' }
const AGE: TTableColumnSource = {
	field: 'age',
	text: 'Возраст',
	align: 'end',
	width: 120,
	sortable: true,
}

/**
 * Колонки с подписями, которые переносятся: шапка выше строки шапки темы, и
 * отступ прокрутки к фокусу верен, только пока высоту пишет плагин.
 */
const LONG: TTableColumnSource[] = [
	{ ...NAME, text: 'Имя сотрудника полностью, как в паспорте' },
	{ ...CITY, text: 'Город, в котором сотрудник работает сейчас' },
	{ ...AGE, text: 'Полных лет на сегодня' },
]

type TEngineOptions = {
	columns?: readonly TTableColumnSource[]
	mode?: TSelectionMode
	grid?: boolean
}

/** Движок строк: `count` записей по кругу, колонки и режимы — из опций. */
function engineOf(count = 40, options: TEngineOptions = {}): TTableCollection {
	const records = Array.from({ length: count }, (_, index) => ({
		id: index + 1,
		name: `Строка ${index + 1}`,
		city: ['Казань', 'Омск', 'Тверь'][index % 3],
		age: 20 + (index % 40),
	}))
	const engine = createEngineTable({ items: records.map((data) => ({ data })) })

	engine.extensions.columns.columns = options.columns ?? [NAME, CITY, AGE]
	engine.extensions.selection.mode = options.mode ?? 'multiple'
	engine.extensions.grid.grid = options.grid ?? false

	return engine
}

/** Таблица с закреплённой шапкой — проп с монтирования. */
const sticky = (engine: TTableCollection, stickyHead = true): VNode =>
	h(Table, { engine, stickyHead, aria_label: 'Строки' })

/** Контейнер прокрутки заданной высоты и ширины. */
const scrollBox = (content: VNode, height = 240, width = 400): VNode =>
	h(
		'div',
		{ class: 's-test-scroll', style: `width: ${width}px; height: ${height}px; overflow: auto` },
		[content],
	)

/** Несколько кадров: узел корня объявляется плагинам кадром позже, наблюдатель пишет в следующем. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

async function show(markup: () => VNode): Promise<void> {
	render(defineComponent({ render: markup }))

	await frames()
}

function scrollingElement(): HTMLElement {
	const node = document.scrollingElement

	if (!(node instanceof HTMLElement)) throw new Error('у документа нет прокрутки')

	return node
}

const box = (element: Element): DOMRect => element.getBoundingClientRect()

/** Шапка — `thead` таблицы в узле. */
const headOf = (root: ParentNode = document): HTMLElement => find('.s-table__head', root)

/** Строки тела — по порядку. */
const rows = (root: ParentNode = document): HTMLElement[] => [
	...root.querySelectorAll<HTMLElement>('.s-table-row'),
]

/** Заголовки колонок — по порядку. */
const headers = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.s-table-column')]

/** Прокрутить контейнер так, чтобы верх строки встал вровень с низом шапки. */
async function rowUnderHead(scroller: HTMLElement, row: Element): Promise<void> {
	scroller.scrollTop += box(row).top - box(headOf()).bottom
	await frames(2)
}

/** Указатель в точку страницы — наводится на `body`: точка бывает между узлами. */
async function pointAt(x: number, y: number): Promise<void> {
	const body = box(document.body)

	await userEvent.hover(document.body, { position: { x: x - body.left, y: y - body.top } })
}

/**
 * Окно — не больше рамки прогона: окно больше неё браузер масштабирует, края
 * шапки на снимке сглаживаются, и снимки расходятся сами. Окно у файла одно —
 * оно и у остальных тестов.
 */
beforeAll(async () => {
	await page.viewport(1000, 700)
})

afterEach(async () => {
	cleanup()
	scrollingElement().scrollTop = 0
	delete document.documentElement.dataset.theme
	await forcedColors('none')
})

describe('место шапки', () => {
	it('без пропа шапка уезжает вместе со строками, и вид её прежний', async () => {
		await show(() => scrollBox(sticky(engineOf(), false)))

		const scroller = find('.s-test-scroll')

		scroller.scrollTop = 300
		await frames(2)

		expect(find('table.s-table').dataset.stickyHead).toBe('false')
		expect(box(headOf()).bottom).toBeLessThan(box(scroller).top)
		// Фона у шапки нет, линия — рамка строки шапки
		expect(opacity(style(headOf()).backgroundColor)).toBe(0)
		expect(style(find('.s-table__head-row')).borderBottomWidth).toBe('1px')
	})

	it('в контейнере — у верха окна прокрутки', async () => {
		await show(() => scrollBox(sticky(engineOf())))

		const scroller = find('.s-test-scroll')

		scroller.scrollTop = 300
		await frames(2)

		expect(Math.abs(box(headOf()).top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
	})

	/**
	 * Приложение со своей закреплённой полосой сдвигает шапку под неё
	 * переменной `--s-table-head-offset` у обёртки таблицы.
	 */
	it('на странице — под закреплённой полосой приложения в 48 px', async () => {
		await show(() =>
			h('div', { style: '--s-table-head-offset: 48px' }, [
				h('div', {
					class: 's-test-bar',
					style: 'position: sticky; top: 0; z-index: 40; height: 48px; background: var(--s-neutral-50)',
				}),
				sticky(engineOf(60)),
			]),
		)

		scrollingElement().scrollTop = 800
		await frames(2)

		const head = box(headOf())

		expect(box(find('.s-test-bar')).top).toBe(0)
		expect(Math.abs(head.top - 48)).toBeLessThanOrEqual(EPSILON)
		// Под полосой — шапка, а не строки
		expect(headOf().contains(document.elementFromPoint(head.left + 40, 50))).toBe(true)
	})

	/**
	 * Тело окна прокручивается само, с отступом сверху. Закреплённое браузер
	 * ставит под отступ, и в нём проступали бы уходящие строки, — поэтому
	 * таблице прямо в теле тема сдвигает шапку к краю тела.
	 */
	it.each([
		['с заголовком', true],
		['без шапки окна', false],
	])('в теле Dialog %s — у края тела, без зазора', async (_name, titled) => {
		await show(() =>
			h(
				Dialog,
				{ visible: true, closable: titled },
				titled
					? { title: () => 'Строки', default: () => sticky(engineOf()) }
					: { default: () => sticky(engineOf()) },
			),
		)

		const body = find('.s-dialog__body')

		expect(body.scrollHeight - body.clientHeight).toBeGreaterThan(300)

		body.scrollTop = 300
		await frames(2)

		expect(parseFloat(style(body).paddingTop)).toBeGreaterThan(0)
		expect(Math.abs(box(headOf(body)).top - box(body).top)).toBeLessThanOrEqual(EPSILON)
	})

	it('в содержимом Popover — у края, без зазора', async () => {
		await show(() =>
			h(
				Popover,
				{ open: true, aria_label: 'Строки' },
				{
					trigger: () => h(Button, { text: 'Открыть' }),
					default: () => sticky(engineOf(20)),
				},
			),
		)

		const content = find('.s-popover__content')

		expect(content.scrollHeight - content.clientHeight).toBeGreaterThan(200)

		content.scrollTop = 200
		await frames(2)

		expect(parseFloat(style(content).paddingTop)).toBeGreaterThan(0)
		expect(Math.abs(box(headOf(content)).top - box(content).top)).toBeLessThanOrEqual(EPSILON)
	})

	/**
	 * Сдвиг к краю — только таблице прямо в содержимом: у таблицы во
	 * вложенном контейнере прокрутки сдвиг унёс бы шапку за его край.
	 */
	it('во вложенной прокрутке в Popover — у края своего контейнера, не срезана', async () => {
		await show(() =>
			h(
				Popover,
				{ open: true, aria_label: 'Строки' },
				{
					trigger: () => h(Button, { text: 'Открыть' }),
					default: () => scrollBox(sticky(engineOf(20)), 160, 280),
				},
			),
		)

		const scroller = find('.s-test-scroll')

		scroller.scrollTop = 200
		await frames(2)

		expect(Math.abs(box(headOf(scroller)).top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
	})
})

/**
 * Шапка закрывает строки, которые уходят под неё: по всей её площади
 * нажатие достаётся шапке. Поле чекбокса строки поднято над ячейкой, и
 * из-под шапки, поднятой ниже, оно ловило бы нажатия по ней.
 */
describe('над строками — шапка', () => {
	/** Колонки с ширинами: таблица уже контейнера, и каждый заголовок виден. */
	const FITTING = [{ ...NAME, width: 110 }, { ...CITY, width: 90 }, AGE]

	it('нажатие над строкой, ушедшей под шапку, — шапке', async () => {
		await show(() => scrollBox(sticky(engineOf(40, { columns: FITTING }))))

		const scroller = find('.s-test-scroll')
		const field = rows()[10].querySelector('.s-table-row__select input')

		if (!(field instanceof HTMLInputElement)) throw new Error('чекбокса строки нет')

		// Середина поля чекбокса строки — посередине шапки
		const middle = (rect: DOMRect) => rect.top + rect.height / 2

		scroller.scrollTop += middle(box(field)) - middle(box(headOf()))
		await frames(2)

		const head = headOf()
		const area = box(head)
		const own = box(field)

		expect(Math.abs(middle(own) - middle(area))).toBeLessThanOrEqual(EPSILON)
		expect(
			head.contains(document.elementFromPoint(own.left + own.width / 2, middle(own))),
		).toBe(true)

		// По всей ширине шапки — у верха, посередине и у линии
		for (const header of head.querySelectorAll('th')) {
			const cell = box(header)

			for (const y of [area.top + 2, middle(area), area.bottom - 1]) {
				expect(
					head.contains(document.elementFromPoint(cell.left + cell.width / 2, y)),
				).toBe(true)
			}
		}
	})
})

/**
 * Фон шапки — поверхность места, на котором стоит таблица (`--s-place-surface`):
 * страница, карточка приложения со своим цветом, панели Popover и Dialog.
 * Шапка непрозрачна, и уходящие строки под ней не проступают.
 */
describe('фон — поверхность места', () => {
	const SCHEMES = ['oren', 'oren-dark'] as const

	/** Место — разметка с таблицей и узел, чей фон — фон места. */
	const PLACES = [
		{
			name: 'страница',
			markup: (table: VNode) =>
				h('div', { class: 's-test-place', style: 'background: var(--s-neutral-50)' }, [
					table,
				]),
			place: () => find('.s-test-place'),
		},
		{
			name: 'карточка своего цвета',
			markup: (table: VNode) =>
				h(
					'div',
					{
						class: 's-test-place',
						style: 'padding: 12px; background: var(--s-neutral-100); --s-place-surface: var(--s-neutral-100)',
					},
					[table],
				),
			place: () => find('.s-test-place'),
		},
		{
			name: 'Popover',
			markup: (table: VNode) =>
				h(
					Popover,
					{ open: true, aria_label: 'Строки' },
					{ trigger: () => h(Button, { text: 'Открыть' }), default: () => table },
				),
			place: () => find('.s-popover__panel'),
		},
		{
			name: 'Dialog',
			markup: (table: VNode) =>
				h(Dialog, { visible: true }, { title: () => 'Строки', default: () => table }),
			place: () => find('.s-dialog'),
		},
	]

	const CASES = SCHEMES.flatMap((scheme) => PLACES.map((place) => ({ scheme, ...place })))

	it.each(CASES)('$scheme, $name: фон шапки — фон места, непрозрачный', async (scenario) => {
		document.documentElement.dataset.theme = scenario.scheme
		await show(() => scenario.markup(sticky(engineOf(5))))

		const place = scenario.place()
		const head = style(headOf(place)).backgroundColor

		expect(opacity(head)).toBe(1)
		expect(pixel([head])).toEqual(pixel([style(place).backgroundColor]))
	})
})

/**
 * Линия под закреплённой шапкой — нижний пиксель её фона, той же ступенью,
 * что линия под шапкой без закрепления: цвета рамки `outlined` у Button.
 * Слитую рамку строки шапки рисует таблица, и у закреплённой шапки она
 * осталась бы на месте, — поэтому рамки у строки шапки нет.
 */
describe('линия под шапкой', () => {
	const SCHEMES = ['oren', 'oren-dark'] as const

	/** Цвет линии — цвет градиента в фоне шапки. */
	function lineColor(head: Element): string {
		const image = style(head).backgroundImage
		const color = /(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)/.exec(image)

		if (!color) throw new Error(`линии в фоне шапки нет: ${image}`)

		return color[0]
	}

	/** Таблица и кнопка `outlined` рядом — на странице и на поверхности контрола. */
	const BACKDROPS = {
		страница: 'var(--s-neutral-50)',
		'поверхность контрола': 'var(--s-component-surface)',
	} as const

	const CASES = SCHEMES.flatMap((scheme) =>
		Object.entries(BACKDROPS).map(([backdrop, color]) => ({ scheme, backdrop, color })),
	)

	it.each(CASES)('$scheme, $backdrop: линия — цвета рамки outlined', async (scenario) => {
		document.documentElement.dataset.theme = scenario.scheme
		await show(() =>
			h(
				'div',
				{
					style: `padding: 8px; background: ${scenario.color}; --s-place-surface: ${scenario.color}`,
				},
				[
					h('div', { class: 's-test-away', style: 'height: 24px' }),
					scrollBox(sticky(engineOf())),
					h(Button, { view: 'outlined', text: 'Рамка' }),
				],
			),
		)
		await userEvent.hover(find('.s-test-away'))

		const scroller = find('.s-test-scroll')

		scroller.scrollTop = 300
		await frames(2)

		const head = headOf()

		expect(style(find('.s-table__head-row')).borderBottomWidth).toBe('0px')
		expect(pixel([lineColor(head)])).toEqual(
			pixel([style(find('.s-button--view-outlined')).borderTopColor]),
		)
	})

	/**
	 * Градиент и фон браузер в этом режиме убрал бы и заменил цветом страницы:
	 * линия пропала бы. Шапка — без подмены, системными цветами страницы и
	 * текста, как линии строк.
	 */
	it.each(SCHEMES)(
		'%s, принудительные цвета: фон — Canvas, линия — CanvasText',
		async (scheme) => {
			document.documentElement.dataset.theme = scheme
			await forcedColors('active')
			await show(() => scrollBox(sticky(engineOf())))

			const head = headOf()

			expect(pixel([style(head).backgroundColor])).toEqual(pixel([systemColor('Canvas')]))
			expect(pixel([lineColor(head)])).toEqual(pixel([systemColor('CanvasText')]))
		},
	)
})

/**
 * Строки не проступают сквозь шапку и в том, что браузер нарисовал: снимок
 * шапки, под которую ушли строки, совпадает до пикселя со снимком без
 * прокрутки, когда строк под ней нет. Вычисленный стиль и `elementFromPoint`
 * отрисовки не видят, а сквозила шапка именно в ней. Фон группы строк Chromium
 * кладёт в площадь каждой ячейки: у скруглённых верхних углов заголовка он
 * срезан, а заголовок, который поменялся посреди перехода своего цвета, —
 * проп включили под указателем, потянули край колонки, переставили колонку, —
 * оставался без него и со старой вуалью, пока его не перерисует что-то ещё.
 * Подложку шапке поэтому рисует её тень (`themes/oren/AGENTS.md`).
 *
 * Сцена — превью стенда: окно прокрутки 320 px, сорок строк, колонки стенда —
 * с сортировкой, ручкой ширины и перестановкой. Ячейки тела — ярко-красные: на
 * поверхности места строка под углом заголовка видна, только когда под ним
 * проходит её линия.
 */
describe('снимок шапки', () => {
	const SCHEMES = ['oren', 'oren-dark'] as const

	/** Прокрутки, на которых под углы и середину шапки заходят строки и их линии. */
	const SCROLLS = [23, 57, 97, 131]

	/** Ячейки тела — ярким цветом стилем спека. */
	const loud = document.createElement('style')

	loud.textContent = '.s-test-stage .s-table-row > * { background-color: rgb(255 0 0); }'

	beforeAll(() => {
		document.head.append(loud)
	})

	afterAll(() => {
		loud.remove()
	})

	/**
	 * Превью таблицы стенда (`previews.ts` хоста Vue): с пропом — окно прокрутки
	 * 320 px и сорок строк, без него — пять строк в потоке. Проп, окно и строки
	 * меняет одно обновление, как на стенде.
	 */
	const preview = (stickyHead: boolean): VNode =>
		h(
			'div',
			{
				class: 's-test-scroll',
				style: stickyHead ? 'width: 100%; height: 320px; overflow: auto' : 'width: 100%',
			},
			[
				h(Table, {
					items: stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS,
					columns: TABLE_COLUMNS,
					aria_label: 'Сотрудники',
					stickyHead,
				}),
			],
		)

	/**
	 * Превью на странице шириной в колонку стенда, а над ним — полоса, куда
	 * уводят указатель. Проп — живой: `stickyHead.value` перерисовывает превью.
	 */
	async function showPreview(scheme: string, sticky: boolean) {
		const stickyHead = ref(sticky)

		document.documentElement.dataset.theme = scheme
		await show(() =>
			h(
				'div',
				{
					class: 's-test-stage',
					style: 'width: 640px; padding: 12px; background: var(--s-neutral-50)',
				},
				[
					h('div', { class: 's-test-away', style: 'height: 24px' }),
					preview(stickyHead.value),
				],
			),
		)
		await away()

		return stickyHead
	}

	/** Указатель — в полосу над превью; переходы заголовков доиграли. */
	async function away(): Promise<void> {
		await userEvent.hover(find('.s-test-away'))
		await settled(headOf())
	}

	/** Снимок узла — пиксели, как их нарисовал браузер. */
	async function snapshot(element: Element): Promise<ImageData> {
		const base64 = await page.screenshot({ element, save: false })
		const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob()
		const image = await createImageBitmap(blob)
		const canvas = new OffscreenCanvas(image.width, image.height)
		const context = canvas.getContext('2d')

		if (!context) throw new Error('канвы нет')

		context.drawImage(image, 0, 0)

		return context.getImageData(0, 0, image.width, image.height)
	}

	/** Сколько пикселей двух снимков одного размера разошлось. */
	function mismatch(reference: ImageData, shot: ImageData): number {
		let count = 0

		for (let index = 0; index < reference.data.length; index += 4) {
			for (let channel = 0; channel < 4; channel++) {
				if (reference.data[index + channel] !== shot.data[index + channel]) {
					count++
					break
				}
			}
		}

		return count
	}

	/**
	 * Цвет заголовка в покое — его пиксель в стороне от подписи, стрелки и
	 * ручки: у конца заголовка, в верхней трети.
	 */
	async function restOf(header: Element): Promise<number[]> {
		const shot = await snapshot(header)
		const x = Math.round(shot.width * 0.85)
		const y = Math.round(shot.height * 0.3)
		const index = (y * shot.width + x) * 4

		return [...shot.data.slice(index, index + 4)]
	}

	/**
	 * Строки уходят под шапку, а её снимок прежний. Эталон — без прокрутки,
	 * когда строк под шапкой нет.
	 */
	async function expectHeadSteady(): Promise<void> {
		const scroller = find('.s-test-scroll')

		scroller.scrollTop = 0
		await frames(2)

		const reference = await snapshot(headOf())

		for (const top of SCROLLS) {
			scroller.scrollTop = top
			await frames(2)

			const shot = await snapshot(headOf())

			expect([shot.width, shot.height], `прокрутка ${top}: размер снимка`).toEqual([
				reference.width,
				reference.height,
			])
			expect(mismatch(reference, shot), `прокрутка ${top}: пикселей шапки разошлось`).toBe(0)
		}
	}

	/** Строки уже под шапкой — как на стенде, когда берут заголовок прокрученной таблицы. */
	async function scrollUnderHead(): Promise<void> {
		find('.s-test-scroll').scrollTop = 57
		await frames(2)
	}

	/** Подписи заголовков — по порядку. */
	const texts = (): Array<string | undefined> =>
		headers().map((header) => header.textContent?.trim())

	/** Заголовок колонки «Имя» — где бы он ни стоял. */
	function nameHeader(): HTMLElement {
		const found = headers().find((header) => header.textContent?.trim() === 'Имя')

		if (!found) throw new Error('заголовка «Имя» нет')

		return found
	}

	it.each(SCHEMES)('%s: проп с монтирования, указатель вдали', async (scheme) => {
		await showPreview(scheme, true)

		await expectHeadSteady()
	})

	it.each(SCHEMES)(
		'%s: проп включили, пока у заголовка под указателем идёт переход',
		async (scheme) => {
			const stickyHead = await showPreview(scheme, false)
			const rest = await restOf(nameHeader())

			await userEvent.hover(nameHeader())
			// Кадр — и переход вуали наведения начался: он идёт 150 мс
			await frames(1)
			stickyHead.value = true
			await frames(2)
			await away()

			expect(await restOf(nameHeader()), 'заголовок после ухода указателя').toEqual(rest)

			await expectHeadSteady()
		},
	)

	it.each(SCHEMES)('%s: протяжка ручки, когда строки уже под шапкой', async (scheme) => {
		await showPreview(scheme, true)
		await scrollUnderHead()

		const rest = await restOf(nameHeader())
		const width = box(nameHeader()).width
		const handle = box(find('.s-table-column__resizer', nameHeader()))
		const x = handle.left + handle.width / 2
		const y = handle.top + handle.height / 2

		await pointAt(x, y)
		await commands.mouseDown()

		try {
			for (const step of [25, 50, 75]) await pointAt(x - step, y)
		} finally {
			await commands.mouseUp()
		}

		await away()

		expect(Math.abs(box(nameHeader()).width - (width - 75))).toBeLessThanOrEqual(EPSILON)
		expect(await restOf(nameHeader()), 'заголовок после ухода указателя').toEqual(rest)

		await expectHeadSteady()
	})

	it.each(SCHEMES)('%s: перестановка заголовка, когда строки уже под шапкой', async (scheme) => {
		await showPreview(scheme, true)
		await scrollUnderHead()

		expect(texts()).toEqual(['Имя', 'Город', 'Возраст'])

		const [name, city] = headers()
		const rest = await restOf(name)
		const from = box(name)
		const x = from.left + from.width / 2
		const y = from.top + from.height / 2

		await pointAt(x, y)
		await commands.mouseDown()

		try {
			await pointAt(x + 40, y)
			await pointAt(box(city).left + box(city).width / 2 + 10, y)
		} finally {
			await commands.mouseUp()
		}

		await away()

		expect(texts()).toEqual(['Город', 'Имя', 'Возраст'])
		expect(await restOf(nameHeader()), 'заголовок после ухода указателя').toEqual(rest)

		await expectHeadSteady()
	})
})

/**
 * Закреплённый элемент — свой слой, и шапка закреплена целиком, а не по
 * ячейкам: полоса ручки ширины лежит половиной на соседнем заголовке, а
 * взятый для перестановки заголовок идёт поверх соседей. В слое на ячейку они
 * ушли бы под соседа.
 */
describe('слои шапки', () => {
	const RESIZABLE = [NAME, CITY, AGE].map((column) => ({
		...column,
		resizable: true,
		reorderable: true,
		width: 120,
	}))

	/** Таблица без колонки выбора в контейнере, прокрученном так, что шапка закреплена. */
	async function mountStuck(): Promise<TTableCollection> {
		const engine = engineOf(40, { columns: RESIZABLE, mode: 'none' })

		await show(() => scrollBox(sticky(engine), 240, 400))

		find('.s-test-scroll').scrollTop = 300
		await frames(2)

		return engine
	}

	it('полоса ручки — над соседом; протяжка на Δ — колонка шире на Δ', async () => {
		const engine = await mountStuck()
		const [name] = headers()
		const edge = box(name)
		const y = edge.top + edge.height / 2
		const resizer = find('.s-table-column__resizer', name)

		expect(resizer.contains(document.elementFromPoint(edge.right + 4, y))).toBe(true)
		expect(resizer.contains(document.elementFromPoint(edge.right - 4, y))).toBe(true)

		const handle = box(resizer)
		const x = handle.left + handle.width / 2

		await pointAt(x, y)
		await commands.mouseDown()

		try {
			await pointAt(x + 20, y)
			await pointAt(x + 40, y)
		} finally {
			await commands.mouseUp()
		}

		expect(engine.extensions.columns.columns[0].width).toBe(160)
		expect(Math.abs(box(name).width - 160)).toBeLessThanOrEqual(EPSILON)
	})

	it('взятый заголовок — над соседом; отпустили — колонка на новом месте', async () => {
		const engine = await mountStuck()
		const [name, city] = headers()
		const from = box(name)
		const y = from.top + from.height / 2
		const x = from.left + from.width / 2

		await pointAt(x, y)
		await commands.mouseDown()

		try {
			await pointAt(x + 40, y)
			await pointAt(box(city).left + box(city).width / 2 + 10, y)

			const dragged = box(name)

			expect(name.dataset.dragging).toBe('true')
			expect(
				name.contains(document.elementFromPoint(dragged.left + dragged.width / 2, y)),
			).toBe(true)
		} finally {
			await commands.mouseUp()
		}

		expect(engine.extensions.columns.columns.map((column) => column.field)).toEqual([
			'city',
			'name',
			'age',
		])
	})
})

/**
 * Фокус ниже шапки. Узел, на который ушёл фокус, браузер доводит до окна
 * прокрутки, а закреплённая шапка стоит внутри окна — и без отступа
 * прокрутки ячейка сетки после ↑ и PageUp и поле в ячейке после Shift+Tab
 * оставались бы под ней. Отступ — высота шапки, которую пишет плагин темы:
 * подписи переносятся, и шапка бывает выше строки.
 */
describe('фокус ниже шапки', () => {
	const LABELS = [
		{ name: 'подписи в строку', columns: [NAME, CITY, AGE], tall: false },
		{ name: 'подписи в несколько строк', columns: LONG, tall: true },
	]

	/** Ячейка заголовка строки — по номеру строки тела с нуля. */
	const cellOf = (index: number): HTMLElement => {
		const cell = rows()[index]?.children[0]

		if (!(cell instanceof HTMLElement)) throw new Error(`строки ${index} нет`)

		return cell
	}

	/** Поле чекбокса строки — по номеру строки тела с нуля. */
	const fieldOf = (index: number): HTMLInputElement => {
		const input = rows()[index]?.querySelector('.s-table-row__select input')

		if (!(input instanceof HTMLInputElement)) throw new Error(`чекбокса строки ${index} нет`)

		return input
	}

	/**
	 * Шапка в строку — ниже строки тела, как строка шапки темы; в несколько
	 * строк — в полторы строки тела и выше: без высоты от плагина отступ мал.
	 */
	function expectHeadHeight(tall: boolean): void {
		const head = box(headOf()).height
		const row = box(rows()[0]).height

		if (tall) expect(head).toBeGreaterThan(row * 1.5)
		else expect(head).toBeLessThan(row)
	}

	/** Узел под фокусом — целиком ниже шапки. */
	function expectBelowHead(): void {
		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		expect(box(active).top).toBeGreaterThanOrEqual(box(headOf()).bottom - EPSILON)
	}

	/** Сетка без колонки выбора в контейнере 300 × 480. */
	const showGrid = (columns: readonly TTableColumnSource[]) =>
		show(() => scrollBox(sticky(engineOf(40, { columns, mode: 'none', grid: true })), 480, 300))

	it.each(LABELS)('$name: ↑ на ячейку под шапкой', async ({ columns, tall }) => {
		await showGrid(columns)

		expectHeadHeight(tall)

		await rowUnderHead(find('.s-test-scroll'), rows()[20])
		await userEvent.click(cellOf(20))

		expect(document.activeElement).toBe(cellOf(20))
		// Строка выше — под шапкой
		expect(box(cellOf(19)).top).toBeLessThan(box(headOf()).bottom - EPSILON)

		await userEvent.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(cellOf(19))
		expectBelowHead()
	})

	it.each(LABELS)('$name: PageUp на ячейку под шапкой', async ({ columns, tall }) => {
		await showGrid(columns)

		expectHeadHeight(tall)

		// Строка на страницу выше — под шапкой, а та, с которой листают, видна
		const scroller = find('.s-test-scroll')

		scroller.scrollTop += box(rows()[20]).top - box(headOf()).top
		await frames(2)

		await userEvent.click(cellOf(30))

		expect(document.activeElement).toBe(cellOf(30))
		expect(box(cellOf(20)).top).toBeLessThan(box(headOf()).bottom - EPSILON)

		await userEvent.keyboard('{PageUp}')

		expect(document.activeElement).toBe(cellOf(20))
		expectBelowHead()
	})

	it.each(LABELS)('$name: Shift+Tab на чекбокс строки под шапкой', async ({ columns, tall }) => {
		await show(() => scrollBox(sticky(engineOf(40, { columns, mode: 'multiple' })), 480, 300))

		expectHeadHeight(tall)

		await rowUnderHead(find('.s-test-scroll'), rows()[20])
		fieldOf(20).focus()

		expect(document.activeElement).toBe(fieldOf(20))
		expect(box(fieldOf(19)).top).toBeLessThan(box(headOf()).bottom - EPSILON)

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(document.activeElement).toBe(fieldOf(19))
		expectBelowHead()
	})
})

/**
 * Высоту шапки пишет плагин темы (`TTableHeadPlugin`) — переменной
 * `--s-table-head-height` на корне, пока шапка закреплена.
 */
describe('высота шапки', () => {
	it('равна высоте шапки, следует за ней и снимается вместе с пропом', async () => {
		const owner = new TTable({ stickyHead: true })
		const engine = engineOf(5)

		await show(() =>
			h('div', { style: 'width: 400px' }, [
				h(Table, { ctrl: owner, engine, aria_label: 'Строки' }),
			]),
		)

		const table = find('table.s-table')
		const height = () => table.style.getPropertyValue('--s-table-head-height')
		const drift = () => Math.abs(parseFloat(height()) - box(headOf()).height)

		await expect.poll(drift).toBeLessThan(0.5)

		const before = box(headOf()).height

		// Подписи длиннее — переносятся, и шапка растёт
		engine.extensions.columns.columns = LONG

		await expect.poll(() => box(headOf()).height).toBeGreaterThan(before + EPSILON)
		await expect.poll(drift).toBeLessThan(0.5)

		owner.stickyHead = false

		await expect.poll(height).toBe('')
	})

	it('без пропа переменной нет', async () => {
		await show(() => sticky(engineOf(5), false))

		expect(find('table.s-table').style.getPropertyValue('--s-table-head-height')).toBe('')
	})
})

/**
 * Окно (обёртка `Virtual`) рисует видимые строки с запасом: шапка закрывает верх
 * видимой полосы, и под ней — строка, а не пустая распорка.
 */
describe('окно', () => {
	it('под шапкой — строки, а не распорка', async () => {
		await show(() =>
			scrollBox(
				h(Virtual, () => sticky(engineOf(1000))),
				320,
			),
		)

		const scroller = find('.s-test-scroll')

		scroller.scrollTop = 12000
		await frames(4)

		const head = box(headOf())
		const body = find('.s-table__body')
		const childAt = (y: number) =>
			[...body.children].find((child) => box(child).top <= y && box(child).bottom > y)

		// Шапка у верха окна прокрутки, а окно ушло далеко от первых строк
		expect(Math.abs(head.top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
		expect(Number(childAt(head.bottom + 1)?.getAttribute('aria-rowindex'))).toBeGreaterThan(100)

		for (const y of [
			head.top + 1,
			head.top + head.height / 2,
			head.bottom - 1,
			head.bottom + 1,
		]) {
			expect(childAt(y)?.classList.contains('s-table-row')).toBe(true)
		}
	})
})
