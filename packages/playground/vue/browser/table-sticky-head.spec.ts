/**
 * Table's sticky head (`stickyHead`) in a real browser: the head stands at the
 * scroll's top edge, and the rows go under it.
 *
 * The core (`core/__tests__/table.spec.ts`) and the adapter
 * (`ui/vue/__tests__/table.spec.ts`) check the prop and its attribute,
 * `themes/oren/__tests__/theme-setup.spec.ts` the height plugin's
 * registration. The shared theme layer sticks the head
 * (`themes/base/src/components/table.css`), and the theme draws the line under
 * it and the shadow backing (`themes/oren/src/components/table/_table.scss`);
 * here is what only a browser shows: where the head stands — at the container's
 * top, on the page under the app's sticky bar, at the edge of Dialog's body and
 * Popover's content, — that the rows don't show through it, the head's
 * background is the place's surface, the line under it has the color of the
 * `outlined` border and shows on the snapshot, the width handle and the reorder
 * over the neighbour work, focus after ↑, PageUp and Shift+Tab stands below the
 * head, and the theme's plugin writes the head's height the shared layer puts it
 * by. Without a theme `theme-base-table.spec.ts` holds the same.
 *
 * That the rows don't show through in what the browser painted either, the
 * head's snapshot checks (`page.screenshot`): the computed style and
 * `elementFromPoint` don't see the painting.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest'
import { render, cleanup } from './render'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h, ref, type VNode } from 'vue'
import { TTable, createEngineTable } from '@soldy-ui/core'
import type { TSelectionMode, TTableCollection, TTableColumnSource } from '@soldy-ui/core'
import { TABLE_COLUMNS, TABLE_ROWS, TABLE_SCROLL_ROWS } from '@soldy-ui/playground-shared'
import { Button, Dialog, Popover, Table, Virtual } from '@soldy-ui/vue'

import { find, gradientColor, opacity, pixel, settled, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

/** Tolerance for subpixel rounding, px. */
const EPSILON = 1

/**
 * Columns with one-line labels: the head is exactly the theme's head row, and
 * its scroll margin to focus is right without the plugin too.
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
 * Columns with labels that wrap: the head is higher than the theme's head row,
 * and the scroll margin to focus is right only while the plugin writes the
 * height.
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

/** A row engine: `count` records in a cycle, the columns and modes from the options. */
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

/** A table with a sticky head — the prop from the mount. */
const sticky = (engine: TTableCollection, stickyHead = true): VNode =>
	h(Table, { engine, stickyHead, aria_label: 'Строки' })

/** A scroll container of the given height and width. */
const scrollBox = (content: VNode, height = 240, width = 400): VNode =>
	h(
		'div',
		{
			class: 'so-test-scroll',
			style: `width: ${width}px; height: ${height}px; overflow: auto`,
		},
		[content],
	)

/** A few frames: the root's node reaches the plugins a frame later, the observer writes in the next one. */
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

/** The head — the table's `thead` in a node. */
const headOf = (root: ParentNode = document): HTMLElement => find('.so-table__head', root)

/** The body's rows, in order. */
const rows = (root: ParentNode = document): HTMLElement[] => [
	...root.querySelectorAll<HTMLElement>('.so-table-row'),
]

/** The column headers, in order. */
const headers = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.so-table-column')]

/** Scroll the container so that the row's top is level with the head's bottom. */
async function rowUnderHead(scroller: HTMLElement, row: Element): Promise<void> {
	scroller.scrollTop += box(row).top - box(headOf()).bottom
	await frames(2)
}

/** The pointer to a point of the page — it hovers `body`: the point may be between nodes. */
async function pointAt(x: number, y: number): Promise<void> {
	const body = box(document.body)

	await userEvent.hover(document.body, { position: { x: x - body.left, y: y - body.top } })
}

/**
 * The window is no bigger than the run's frame: a bigger window the browser
 * scales, the head's edges on the snapshot get smoothed, and the snapshots
 * differ by themselves. The file has one window — the other tests get it too.
 */
beforeAll(async () => {
	await page.viewport(1000, 700)
})

afterEach(async () => {
	cleanup()
	scrollingElement().scrollTop = 0
	delete document.documentElement.dataset.soTheme
	await forcedColors('none')
})

describe('место шапки', () => {
	it('без пропа шапка уезжает вместе со строками, и вид её прежний', async () => {
		await show(() => scrollBox(sticky(engineOf(), false)))

		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 300
		await frames(2)

		expect(find('table.so-table').dataset.stickyHead).toBe('false')
		expect(box(headOf()).bottom).toBeLessThan(box(scroller).top)
		// The head has no background, the line is the head row's border
		expect(opacity(style(headOf()).backgroundColor)).toBe(0)
		expect(style(find('.so-table__head-row')).borderBottomWidth).toBe('1px')
	})

	it('в контейнере — у верха окна прокрутки', async () => {
		await show(() => scrollBox(sticky(engineOf())))

		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 300
		await frames(2)

		expect(Math.abs(box(headOf()).top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
	})

	/**
	 * An app with its own sticky bar moves the head under it with the
	 * `--so-table-head-offset` variable on the table's wrapper.
	 */
	it('на странице — под закреплённой полосой приложения в 48 px', async () => {
		await show(() =>
			h('div', { style: '--so-table-head-offset: 48px' }, [
				h('div', {
					class: 'so-test-bar',
					style: 'position: sticky; top: 0; z-index: 40; height: 48px; background: var(--so-neutral-50)',
				}),
				sticky(engineOf(60)),
			]),
		)

		scrollingElement().scrollTop = 800
		await frames(2)

		const head = box(headOf())

		expect(box(find('.so-test-bar')).top).toBe(0)
		expect(Math.abs(head.top - 48)).toBeLessThanOrEqual(EPSILON)
		// Under the bar — the head, not the rows
		expect(headOf().contains(document.elementFromPoint(head.left + 40, 50))).toBe(true)
	})

	/**
	 * The dialog's body scrolls by itself, with a padding on top. The browser
	 * sticks below the padding, and the rows leaving would show through it — so for
	 * a table right in the body the theme moves the head to the body's edge.
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

		const body = find('.so-dialog__body')

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

		const content = find('.so-popover__content')

		expect(content.scrollHeight - content.clientHeight).toBeGreaterThan(200)

		content.scrollTop = 200
		await frames(2)

		expect(parseFloat(style(content).paddingTop)).toBeGreaterThan(0)
		expect(Math.abs(box(headOf(content)).top - box(content).top)).toBeLessThanOrEqual(EPSILON)
	})

	/**
	 * The move to the edge is only for a table right in the content: for a table
	 * in a nested scroll container the offset would carry the head past its edge.
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

		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 200
		await frames(2)

		expect(Math.abs(box(headOf(scroller)).top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
	})
})

/**
 * The head covers the rows going under it: over its whole area a press goes to
 * the head. A row checkbox's field is raised over the cell, and from under a
 * head raised lower it would catch the presses on it.
 */
describe('над строками — шапка', () => {
	/** Columns with widths: the table is narrower than the container, and every header shows. */
	const FITTING = [{ ...NAME, width: 110 }, { ...CITY, width: 90 }, AGE]

	it('нажатие над строкой, ушедшей под шапку, — шапке', async () => {
		await show(() => scrollBox(sticky(engineOf(40, { columns: FITTING }))))

		const scroller = find('.so-test-scroll')
		const field = rows()[10].querySelector('.so-table-row__select input')

		if (!(field instanceof HTMLInputElement)) throw new Error('чекбокса строки нет')

		// The middle of the row checkbox's field in the middle of the head
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

		// Across the head's whole width — at the top, in the middle and at the line
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
 * The head's background is the surface of the place the table stands on
 * (`--so-place-surface`): the page, an app's card with its own color, the
 * panels of Popover and Dialog. The head is opaque, and the rows leaving under
 * it don't show through.
 */
describe('фон — поверхность места', () => {
	const SCHEMES = ['oren', 'oren-dark'] as const

	/** A place — the markup with the table and the node whose background is the place's. */
	const PLACES = [
		{
			name: 'страница',
			markup: (table: VNode) =>
				h('div', { class: 'so-test-place', style: 'background: var(--so-neutral-50)' }, [
					table,
				]),
			place: () => find('.so-test-place'),
		},
		{
			name: 'карточка своего цвета',
			markup: (table: VNode) =>
				h(
					'div',
					{
						class: 'so-test-place',
						style: 'padding: 12px; background: var(--so-neutral-100); --so-place-surface: var(--so-neutral-100)',
					},
					[table],
				),
			place: () => find('.so-test-place'),
		},
		{
			name: 'Popover',
			markup: (table: VNode) =>
				h(
					Popover,
					{ open: true, aria_label: 'Строки' },
					{ trigger: () => h(Button, { text: 'Открыть' }), default: () => table },
				),
			place: () => find('.so-popover__panel'),
		},
		{
			name: 'Dialog',
			markup: (table: VNode) =>
				h(Dialog, { visible: true }, { title: () => 'Строки', default: () => table }),
			place: () => find('.so-dialog'),
		},
	]

	const CASES = SCHEMES.flatMap((scheme) => PLACES.map((place) => ({ scheme, ...place })))

	it.each(CASES)('$scheme, $name: фон шапки — фон места, непрозрачный', async (scenario) => {
		document.documentElement.dataset.soTheme = scenario.scheme
		await show(() => scenario.markup(sticky(engineOf(5))))

		const place = scenario.place()
		const head = style(headOf(place)).backgroundColor

		expect(opacity(head)).toBe(1)
		expect(pixel([head])).toEqual(pixel([style(place).backgroundColor]))
	})
})

/**
 * The line under the sticky head is the bottom pixel of its background, at the
 * same step as the line under a head that doesn't stick: the color of Button's
 * `outlined` border. The table paints the head row's collapsed border, and under
 * a sticky head it would stay in place — so the head row has no border.
 */
describe('линия под шапкой', () => {
	const SCHEMES = ['oren', 'oren-dark'] as const

	/** A table and an `outlined` button next to it — on the page and on the control surface. */
	const BACKDROPS = {
		страница: 'var(--so-neutral-50)',
		'поверхность контрола': 'var(--so-component-surface)',
	} as const

	const CASES = SCHEMES.flatMap((scheme) =>
		Object.entries(BACKDROPS).map(([backdrop, color]) => ({ scheme, backdrop, color })),
	)

	it.each(CASES)('$scheme, $backdrop: линия — цвета рамки outlined', async (scenario) => {
		document.documentElement.dataset.soTheme = scenario.scheme
		await show(() =>
			h(
				'div',
				{
					style: `padding: 8px; background: ${scenario.color}; --so-place-surface: ${scenario.color}`,
				},
				[
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					scrollBox(sticky(engineOf())),
					h(Button, { view: 'outlined', text: 'Рамка' }),
				],
			),
		)
		await userEvent.hover(find('.so-test-away'))

		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 300
		await frames(2)

		const head = headOf()

		expect(style(find('.so-table__head-row')).borderBottomWidth).toBe('0px')
		expect(pixel([gradientColor(head)])).toEqual(
			pixel([style(find('.so-button--view-outlined')).borderTopColor]),
		)
	})

	/**
	 * In this mode the browser would drop the gradient and the background and put
	 * the page's color instead: the line would vanish. The head goes without the
	 * replacement, in the system colors of the page and the text, like the row
	 * lines.
	 */
	it.each(SCHEMES)(
		'%s, принудительные цвета: фон — Canvas, линия — CanvasText',
		async (scheme) => {
			document.documentElement.dataset.soTheme = scheme
			await forcedColors('active')
			await show(() => scrollBox(sticky(engineOf())))

			const head = headOf()

			expect(pixel([style(head).backgroundColor])).toEqual(pixel([systemColor('Canvas')]))
			expect(pixel([gradientColor(head)])).toEqual(pixel([systemColor('CanvasText')]))
		},
	)
})

/**
 * The rows don't show through the head in what the browser painted either: the
 * snapshot of a head with rows gone under it matches the snapshot without
 * scrolling, with no rows under it, to the pixel. The computed style and
 * `elementFromPoint` don't see the painting, and it was the painting the head
 * leaked in. The browser puts the row group's background into each cell's area:
 * at a header's rounded top corners it is cut off — in WebKit the rows showed
 * under the head's outer corners, — and in Chromium a header changed in the
 * middle of its color transition — the prop turned on under the pointer, a
 * column's edge dragged, a column moved — stayed without it and with the old
 * veil until something else repainted it. So the base lays a square of the
 * place's surface under each header, and the theme also paints the backing with
 * the head's shadow (`themes/oren/AGENTS.md`). The squares stop above the line
 * the theme draws under the head: on the snapshot the line shows under every
 * header.
 *
 * The scene is the stand's preview: a 320 px scroll window, forty rows, the
 * stand's columns — with sorting, a width handle and reordering. The body cells
 * are bright red: on the place's surface a row under a header's corner shows
 * only when its line passes under it.
 */
describe('снимок шапки', () => {
	const SCHEMES = ['oren', 'oren-dark'] as const

	/** The scrolls at which the rows and their lines go under the corners and the middle of the head. */
	const SCROLLS = [23, 57, 97, 131]

	/** The body's cells — in a bright color, by the spec's style. */
	const loud = document.createElement('style')

	loud.textContent = '.so-test-stage .so-table-row > * { background-color: rgb(255 0 0); }'

	beforeAll(() => {
		document.head.append(loud)
	})

	afterAll(() => {
		loud.remove()
	})

	/**
	 * The stand's table preview (`previews.ts` of the Vue host): with the prop — a
	 * 320 px scroll window and forty rows, without it — five rows in the flow. One
	 * update changes the prop, the window and the rows, as on the stand.
	 */
	const preview = (stickyHead: boolean): VNode =>
		h(
			'div',
			{
				class: 'so-test-scroll',
				style: stickyHead ? 'width: 100%; height: 320px; overflow: auto' : 'width: 100%',
			},
			[
				h(Table, {
					items: stickyHead ? TABLE_SCROLL_ROWS : TABLE_ROWS,
					columns: TABLE_COLUMNS,
					aria_label: 'Сотрудники',
					resizable: true,
					reorderable: true,
					stickyHead,
				}),
			],
		)

	/**
	 * The preview on a page as wide as the stand's column, and over it a bar the
	 * pointer is taken to. The prop is live: `stickyHead.value` repaints the
	 * preview.
	 */
	async function showPreview(scheme: string, sticky: boolean) {
		const stickyHead = ref(sticky)

		document.documentElement.dataset.soTheme = scheme
		await show(() =>
			h(
				'div',
				{
					class: 'so-test-stage',
					style: 'width: 640px; padding: 12px; background: var(--so-neutral-50)',
				},
				[
					h('div', { class: 'so-test-away', style: 'height: 24px' }),
					preview(stickyHead.value),
				],
			),
		)
		await away()

		return stickyHead
	}

	/** The pointer to the bar over the preview; the headers' transitions are over. */
	async function away(): Promise<void> {
		await userEvent.hover(find('.so-test-away'))
		await settled(headOf())
	}

	/** A node's snapshot — the pixels as the browser painted them. */
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

	/** How many pixels of two snapshots of one size differ. */
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
	 * A header's color at rest — its pixel away from the label, the arrow and the
	 * handle: near the header's end, in the upper third.
	 */
	async function restOf(header: Element): Promise<number[]> {
		const shot = await snapshot(header)
		const x = Math.round(shot.width * 0.85)
		const y = Math.round(shot.height * 0.3)
		const index = (y * shot.width + x) * 4

		return [...shot.data.slice(index, index + 4)]
	}

	/**
	 * The rows go under the head, and its snapshot stays. The reference is without
	 * scrolling, when there are no rows under the head. On it the line under the
	 * head — the bottom row of pixels — shows under every header.
	 */
	async function expectHeadSteady(): Promise<void> {
		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 0
		await frames(2)

		const reference = await snapshot(headOf())
		const line = pixel([gradientColor(headOf())])
		const area = box(headOf())

		for (const header of headOf().querySelectorAll('th')) {
			const x = Math.round(box(header).left - area.left + box(header).width / 2)
			const index = ((reference.height - 1) * reference.width + x) * 4
			const drawn = [...reference.data.slice(index, index + 4)]

			expect(
				drawn.every((channel, at) => Math.abs(channel - line[at]) <= 1),
				`линия под заголовком «${header.textContent?.trim()}»: ${drawn} — ${[...line]}`,
			).toBe(true)
		}

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

	/** The rows are under the head already — as on the stand when a header of a scrolled table is taken. */
	async function scrollUnderHead(): Promise<void> {
		find('.so-test-scroll').scrollTop = 57
		await frames(2)
	}

	/** The headers' labels, in order. */
	const texts = (): Array<string | undefined> =>
		headers().map((header) => header.textContent?.trim())

	/** The header of the «Имя» column — wherever it stands. */
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
			// A frame — and the hover veil's transition has started: it runs 150 ms
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
		const handle = box(find('.so-table-column__resizer', nameHeader()))
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

		// The column lands once the released header has reached its place
		await expect.poll(texts).toEqual(['Город', 'Имя', 'Возраст'])
		await away()
		expect(await restOf(nameHeader()), 'заголовок после ухода указателя').toEqual(rest)

		await expectHeadSteady()
	})
})

/**
 * A sticky element is a layer of its own, and the head sticks whole, not cell by
 * cell: the width handle's strip lies half on the next header, and a header
 * taken for reordering goes over its neighbours. With a layer per cell they
 * would go under the neighbour.
 */
describe('слои шапки', () => {
	const RESIZABLE = [NAME, CITY, AGE].map((column) => ({
		...column,
		resizable: true,
		reorderable: true,
		width: 120,
	}))

	/** A table without the selection column in a container scrolled so that the head sticks. */
	async function mountStuck(): Promise<TTableCollection> {
		const engine = engineOf(40, { columns: RESIZABLE, mode: 'none' })

		await show(() => scrollBox(sticky(engine), 240, 400))

		find('.so-test-scroll').scrollTop = 300
		await frames(2)

		return engine
	}

	it('полоса ручки — над соседом; протяжка на Δ — колонка шире на Δ', async () => {
		const engine = await mountStuck()
		const [name] = headers()
		const edge = box(name)
		const y = edge.top + edge.height / 2
		const resizer = find('.so-table-column__resizer', name)

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

		// The column lands once the released header has reached its place
		await expect
			.poll(() => engine.extensions.columns.columns.map((column) => column.field))
			.toEqual(['city', 'name', 'age'])
	})
})

/**
 * Focus below the head. The browser brings the node focus went to into the
 * scroll window, and the sticky head stands inside the window — without a
 * scroll margin a grid cell after ↑ and PageUp and a field in a cell after
 * Shift+Tab would stay under it. The margin is the head's height the layout
 * plugin writes: labels wrap, and the head may be higher than a row.
 */
describe('фокус ниже шапки', () => {
	const LABELS = [
		{ name: 'подписи в строку', columns: [NAME, CITY, AGE], tall: false },
		{ name: 'подписи в несколько строк', columns: LONG, tall: true },
	]

	/** A row header cell — by the body row's number from zero. */
	const cellOf = (index: number): HTMLElement => {
		const cell = rows()[index]?.children[0]

		if (!(cell instanceof HTMLElement)) throw new Error(`строки ${index} нет`)

		return cell
	}

	/** A row checkbox's field — by the body row's number from zero. */
	const fieldOf = (index: number): HTMLInputElement => {
		const input = rows()[index]?.querySelector('.so-table-row__select input')

		if (!(input instanceof HTMLInputElement)) throw new Error(`чекбокса строки ${index} нет`)

		return input
	}

	/**
	 * A one-line head is lower than a body row, like the theme's head row; a head of
	 * several lines is one and a half body rows high and more: without the plugin's
	 * height the margin is too small.
	 */
	function expectHeadHeight(tall: boolean): void {
		const head = box(headOf()).height
		const row = box(rows()[0]).height

		if (tall) expect(head).toBeGreaterThan(row * 1.5)
		else expect(head).toBeLessThan(row)
	}

	/** The focused node is wholly below the head. */
	function expectBelowHead(): void {
		const active = document.activeElement

		if (!active) throw new Error('фокуса нет')

		expect(box(active).top).toBeGreaterThanOrEqual(box(headOf()).bottom - EPSILON)
	}

	/** A grid without the selection column in a 300 × 480 container. */
	const showGrid = (columns: readonly TTableColumnSource[]) =>
		show(() => scrollBox(sticky(engineOf(40, { columns, mode: 'none', grid: true })), 480, 300))

	it.each(LABELS)('$name: ↑ на ячейку под шапкой', async ({ columns, tall }) => {
		await showGrid(columns)

		expectHeadHeight(tall)

		await rowUnderHead(find('.so-test-scroll'), rows()[20])
		await userEvent.click(cellOf(20))

		expect(document.activeElement).toBe(cellOf(20))
		// The row above is under the head
		expect(box(cellOf(19)).top).toBeLessThan(box(headOf()).bottom - EPSILON)

		await userEvent.keyboard('{ArrowUp}')

		expect(document.activeElement).toBe(cellOf(19))
		expectBelowHead()
	})

	it.each(LABELS)('$name: PageUp на ячейку под шапкой', async ({ columns, tall }) => {
		await showGrid(columns)

		expectHeadHeight(tall)

		// The row a page above is under the head, and the one paged from is visible
		const scroller = find('.so-test-scroll')

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

		await rowUnderHead(find('.so-test-scroll'), rows()[20])
		fieldOf(20).focus()

		expect(document.activeElement).toBe(fieldOf(20))
		expect(box(fieldOf(19)).top).toBeLessThan(box(headOf()).bottom - EPSILON)

		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(document.activeElement).toBe(fieldOf(19))
		expectBelowHead()
	})
})

/**
 * The layout plugin of the shared theme layer (`TTableHeadPlugin`,
 * `useTheme(oren)` installs it) writes the head's height — the
 * `--so-table-head-height` variable on the root while the head sticks.
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

		const table = find('table.so-table')
		const height = () => table.style.getPropertyValue('--so-table-head-height')
		const drift = () => Math.abs(parseFloat(height()) - box(headOf()).height)

		await expect.poll(drift).toBeLessThan(0.5)

		const before = box(headOf()).height

		// Longer labels wrap, and the head grows
		engine.extensions.columns.columns = LONG

		await expect.poll(() => box(headOf()).height).toBeGreaterThan(before + EPSILON)
		await expect.poll(drift).toBeLessThan(0.5)

		owner.stickyHead = false

		await expect.poll(height).toBe('')
	})

	it('без пропа переменной нет', async () => {
		await show(() => sticky(engineOf(5), false))

		expect(find('table.so-table').style.getPropertyValue('--so-table-head-height')).toBe('')
	})
})

/**
 * The window (a `Virtual` wrapper) draws the visible rows with a margin: the head
 * covers the top of the visible band, and under it there is a row, not an empty
 * spacer.
 */
describe('окно', () => {
	it('под шапкой — строки, а не распорка', async () => {
		await show(() =>
			scrollBox(
				h(Virtual, () => sticky(engineOf(1000))),
				320,
			),
		)

		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 12000
		await frames(4)

		const head = box(headOf())
		const body = find('.so-table__body')
		const childAt = (y: number) =>
			[...body.children].find((child) => box(child).top <= y && box(child).bottom > y)

		// The head is at the scroll window's top, and the window went far from the first rows
		expect(Math.abs(head.top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
		expect(Number(childAt(head.bottom + 1)?.getAttribute('aria-rowindex'))).toBeGreaterThan(100)

		for (const y of [
			head.top + 1,
			head.top + head.height / 2,
			head.bottom - 1,
			head.bottom + 1,
		]) {
			expect(childAt(y)?.classList.contains('so-table-row')).toBe(true)
		}
	})
})
