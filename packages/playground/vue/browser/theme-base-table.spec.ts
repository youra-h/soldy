/**
 * The shared theme layer without a theme — the table: a page with the base's
 * CSS only (`@soldy-ui/theme-base`), without `@soldy-ui/theme-oren`.
 *
 * Table's structure — layout and mechanics — lies in the base, the look and the
 * motion in the theme (`packages/themes/base/AGENTS.md`, «Перенос структуры»).
 * Without a theme the table is bare — no color, lines, veils or transitions, —
 * but working, and here that is checked by what the user sees, not by the
 * base's numbers: a table with known column widths is as wide as their sum, not
 * as the whole place; columns wider than the place — the window scrolls the
 * table sideways, and with a sticky head it doesn't — the container scrolls; the
 * sticky head stands at the scroll window's top, and the rows gone under it
 * neither show through nor catch the presses over it, at the rounded corners a
 * theme gives the headers too, and the line the theme draws under the head stays
 * visible; a cell focus went to after ↑ stands below the head — also when the
 * labels wrap and the layout plugin writes the head's height (`useTheme` in
 * `browser/setup.ts` installs it, and it carries no CSS). The specs with a theme
 * hold the base under the theme, and the theme could cover a rule the base lost
 * with its own, while the CSS guards (`themes/base/__tests__/`) don't compute
 * the layout.
 *
 * The table has no surface of its own: the opaque background of the sticky head
 * is the surface of the place (`--so-place-surface`), and the place declares it.
 * Here the place is the spec's card with its own background and the same
 * declaration next to it, as in an app.
 *
 * The spec file has a page of its own (the run's `isolate`), and there is no
 * theme sheet on it — the first test checks that. Proven by breaking: without
 * the zero width of a table with `data-sized` (`components/table.css`) it takes
 * the place's full width, without the window's scroll by `data-overflow` the
 * table goes past the window while the window stands, without `sticky` the head
 * leaves with the rows, without the backing in the place's color or without the
 * head's raise over the body the rows and checkboxes show through on the head's
 * snapshot, without the squares under the headers the rows show at their
 * rounded corners, a square without the line's inset covers the theme's line,
 * and without the scroll margin to focus the cell after ↑ stands under the
 * head.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest'
import { render, cleanup } from './render'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TSelectionMode, TTableCollection, TTableColumnSource } from '@soldy-ui/core'
import { Table } from '@soldy-ui/vue'

import '@soldy-ui/theme-base'

/** Tolerance for subpixel rounding of coordinates, px. */
const EPSILON = 1

/** The background of the spec's place and the place's surface it declares next to it. */
const PLACE = 'background: rgb(255 255 255); --so-place-surface: rgb(255 255 255)'

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true }
const CITY: TTableColumnSource = { field: 'city', text: 'Город' }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', align: 'end' }

/**
 * Labels that wrap: the head is higher than the head row, and the scroll margin
 * to focus is right only while the layout plugin writes its height.
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
	engine.extensions.selection.mode = options.mode ?? 'none'
	engine.extensions.grid.grid = options.grid ?? false

	return engine
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** The markup on the page and the frames: the plugins get the nodes by `ready`, a frame later. */
async function show(content: () => VNode): Promise<void> {
	render(
		defineComponent({
			render: () => h('div', { style: `padding: 40px; ${PLACE}` }, content()),
		}),
	)

	await nextTick()
	await nextFrame()
	await nextFrame()
	await nextFrame()
}

/** A node by its selector; without it the test fails here, not on reading a property. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const box = (element: Element) => element.getBoundingClientRect()

const width = (element: Element) => box(element).width

/** The table is its `table` root, the window the node around it. */
const table = () => find('table.so-table')
const viewport = () => find('.so-table__viewport')
const head = () => find('.so-table__head')

/** The column headers and the body rows, in order. */
const headers = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.so-table-column')]
const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.so-table-row')]

/** A table in a scroll container of the given height and width. */
const scrollBox = (content: VNode, height = 240, boxWidth = 400): VNode =>
	h(
		'div',
		{
			class: 'so-test-scroll',
			style: `width: ${boxWidth}px; height: ${height}px; overflow: auto`,
		},
		[content],
	)

/** A table with a sticky head. */
const sticky = (engine: TTableCollection): VNode =>
	h(Table, { engine, stickyHead: true, aria_label: 'Строки' })

/** Scroll the container so that the row's top is level with the head's bottom. */
async function rowUnderHead(scroller: HTMLElement, row: Element): Promise<void> {
	scroller.scrollTop += box(row).top - box(head()).bottom
	await nextFrame()
	await nextFrame()
}

/**
 * The window is no bigger than the run's frame: a bigger window the browser
 * scales, the edges on the head's snapshot get smoothed, and the snapshots
 * differ by themselves. The file has one window — the other tests get it too.
 */
beforeAll(async () => {
	await page.viewport(1000, 700)
})

afterEach(() => {
	cleanup()
})

describe('страница — только общий слой тем', () => {
	it('переменные базы на месте, токенов темы нет', () => {
		const root = getComputedStyle(document.documentElement)

		expect(root.getPropertyValue('--so-table-bleed')).not.toBe('')
		expect(root.getPropertyValue('--so-component-surface')).toBe('')
		expect(root.getPropertyValue('--so-neutral-500')).toBe('')
	})
})

/**
 * The core lays out the column widths, and the plugin measures the place a frame
 * after mounting, so the test polls for the layout.
 */
describe('ширины колонок', () => {
	it('известны у всех колонок — таблица шириной в их сумму, а не во всю ширину места', async () => {
		const columns = [
			{ ...NAME, width: 140 },
			{ ...CITY, width: 110 },
			{ ...AGE, width: 90 },
		]

		await show(() =>
			h('div', { style: 'width: 600px' }, [
				h(Table, { engine: engineOf(3, { columns }), aria_label: 'Строки' }),
			]),
		)

		await expect.poll(() => table().dataset.sized).toBe('true')

		expect(headers().map(width)).toEqual([140, 110, 90])
		expect(Math.abs(width(table()) - 340), 'таблица — сумма колонок').toBeLessThanOrEqual(
			EPSILON,
		)
		expect(Math.abs(width(viewport()) - 600), 'окно — во всю ширину места').toBeLessThanOrEqual(
			EPSILON,
		)
	})
})

describe('окно — прокрутка вбок', () => {
	const WIDE = [
		{ ...NAME, width: 200 },
		{ ...CITY, width: 200 },
		{ ...AGE, width: 200 },
	]

	it('колонки шире места — окно прокручивает таблицу вбок, в своих границах', async () => {
		await show(() =>
			h('div', { style: 'width: 300px' }, [
				h(Table, { engine: engineOf(3, { columns: WIDE }), aria_label: 'Строки' }),
			]),
		)

		await expect.poll(() => table().dataset.overflow).toBe('true')

		const pane = viewport()

		expect(Math.abs(width(pane) - 300), 'окно — в ширину места').toBeLessThanOrEqual(EPSILON)
		expect(width(table())).toBeGreaterThan(width(pane))

		const [first] = headers()
		const before = box(first).left

		pane.scrollLeft = 120
		await nextFrame()

		expect(pane.scrollLeft, 'окно прокрутилось').toBe(120)
		expect(
			Math.abs(box(first).left - (before - 120)),
			'таблица — вместе с ним',
		).toBeLessThanOrEqual(EPSILON)
	})

	it('с закреплённой шапкой окно не прокручивается: вбок прокручивает контейнер', async () => {
		await show(() => scrollBox(sticky(engineOf(3, { columns: WIDE })), 240, 300))

		await expect.poll(() => table().dataset.overflow).toBe('true')

		const pane = viewport()
		const scroller = find('.so-test-scroll')

		pane.scrollLeft = 120
		await nextFrame()

		expect(pane.scrollLeft, 'окно не прокручивается').toBe(0)
		expect(scroller.scrollWidth, 'вбок прокручивает контейнер').toBeGreaterThan(
			scroller.clientWidth,
		)
	})
})

describe('закреплённая шапка', () => {
	it('в контейнере — у верха окна прокрутки', async () => {
		await show(() => scrollBox(sticky(engineOf())))

		const scroller = find('.so-test-scroll')

		scroller.scrollTop = 300
		await nextFrame()
		await nextFrame()

		expect(box(rows()[0]).bottom, 'первые строки ушли вверх').toBeLessThan(box(scroller).top)
		expect(Math.abs(box(head()).top - box(scroller).top)).toBeLessThanOrEqual(EPSILON)
	})

	it('нажатие над строкой, ушедшей под шапку, — шапке', async () => {
		const columns = [{ ...NAME, width: 110 }, { ...CITY, width: 90 }, AGE]

		await show(() => scrollBox(sticky(engineOf(40, { columns, mode: 'multiple' }))))

		const scroller = find('.so-test-scroll')
		const field = rows()[10].querySelector('.so-table-row__select input')

		if (!(field instanceof HTMLInputElement)) throw new Error('чекбокса строки нет')

		// The middle of the row checkbox's field in the middle of the head
		const middle = (rect: DOMRect) => rect.top + rect.height / 2

		scroller.scrollTop += middle(box(field)) - middle(box(head()))
		await nextFrame()
		await nextFrame()

		const own = box(field)

		expect(Math.abs(middle(own) - middle(box(head())))).toBeLessThanOrEqual(EPSILON)
		expect(
			head().contains(document.elementFromPoint(own.left + own.width / 2, middle(own))),
		).toBe(true)
	})

	/**
	 * That the rows don't show through the head is seen only in what the browser
	 * painted: the snapshot of the head with rows gone under it is the same as
	 * without scrolling. The spec's style paints the body's cells and checkboxes
	 * in bright colors: the checkbox is positioned, and only the head's raise holds
	 * the head over it.
	 */
	describe('строки под шапкой не просвечивают', () => {
		/** The scrolls at which the rows and their checkboxes go under the head. */
		const SCROLLS = [23, 57, 97, 131]

		const loud = document.createElement('style')

		loud.textContent = [
			'.so-test-scroll .so-table-row > * { background-color: rgb(255 0 0); }',
			'.so-test-scroll .so-table-row .so-check-box { background-color: rgb(0 0 255); }',
		].join('\n')

		beforeAll(() => {
			document.head.append(loud)
		})

		afterAll(() => {
			loud.remove()
		})

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

		it('снимок шапки над ушедшими строками — тот же, что без прокрутки', async () => {
			await show(() => scrollBox(sticky(engineOf(40, { mode: 'multiple' })), 320, 640))

			const scroller = find('.so-test-scroll')
			const reference = await snapshot(head())

			for (const top of SCROLLS) {
				scroller.scrollTop = top
				await nextFrame()
				await nextFrame()

				const shot = await snapshot(head())

				expect([shot.width, shot.height], `прокрутка ${top}: размер снимка`).toEqual([
					reference.width,
					reference.height,
				])
				expect(
					mismatch(reference, shot),
					`прокрутка ${top}: пикселей шапки разошлось`,
				).toBe(0)
			}
		})

		/**
		 * A theme rounds the headers' top corners and draws a line under the
		 * sticky head in the head's background, as oren does; the spec's style
		 * plays that theme. The row group's background doesn't reach under the
		 * rounded corners, so the base lays a square of the place's surface under
		 * each header, and the square stops short of the line by the thickness the
		 * theme names (`--so-table-head-border`), or it would cover the line.
		 */
		it('скруглённые заголовки и линия темы под шапкой: у углов строки не проступают, линия видна', async () => {
			const LINE = [0, 128, 0, 255]
			const theme = document.createElement('style')

			theme.textContent = [
				'.so-test-scroll :is(.so-table-column, .so-table__select) { border-start-start-radius: 8px; border-start-end-radius: 8px; }',
				'.so-test-scroll .so-table__head { --so-table-head-border: 2px; background-image: linear-gradient(rgb(0 128 0), rgb(0 128 0)); background-position: bottom; background-size: 100% 2px; background-repeat: no-repeat; }',
			].join('\n')
			document.head.append(theme)

			try {
				await show(() => scrollBox(sticky(engineOf(40, { mode: 'multiple' })), 320, 640))

				const scroller = find('.so-test-scroll')
				const reference = await snapshot(head())
				const area = box(head())
				const pixelAt = (shot: ImageData, x: number, y: number): number[] => {
					const index = (y * shot.width + x) * 4

					return [...shot.data.slice(index, index + 4)]
				}

				// The line under every header: the two bottom rows of the head
				for (const cell of head().querySelectorAll('th')) {
					const x = Math.round(box(cell).left - area.left + box(cell).width / 2)

					for (const y of [reference.height - 1, reference.height - 2]) {
						expect(pixelAt(reference, x, y), `линия под заголовком, ${x}:${y}`).toEqual(
							LINE,
						)
					}
				}

				for (const top of SCROLLS) {
					scroller.scrollTop = top
					await nextFrame()
					await nextFrame()

					expect(
						mismatch(reference, await snapshot(head())),
						`прокрутка ${top}: пикселей шапки разошлось`,
					).toBe(0)
				}
			} finally {
				theme.remove()
			}
		})
	})

	/**
	 * Focus below the head. The browser brings the node focus went to into the
	 * scroll window, and the sticky head stands inside the window — without a
	 * scroll margin a grid cell after ↑ would stay under it. The margin is the
	 * head's height the layout plugin writes: labels wrap, and the head may be
	 * higher than a row.
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

		it.each(LABELS)('$name: ↑ на ячейку под шапкой', async ({ columns, tall }) => {
			await show(() => scrollBox(sticky(engineOf(40, { columns, grid: true })), 480, 300))

			const height = box(head()).height
			const row = box(rows()[0]).height

			if (tall) expect(height, 'шапка выше строки').toBeGreaterThan(row * 1.5)
			else expect(height, 'шапка — в строку').toBeLessThan(row)

			await rowUnderHead(find('.so-test-scroll'), rows()[20])
			await userEvent.click(cellOf(20))

			expect(document.activeElement).toBe(cellOf(20))
			// The row above is under the head
			expect(box(cellOf(19)).top).toBeLessThan(box(head()).bottom - EPSILON)

			await userEvent.keyboard('{ArrowUp}')

			expect(document.activeElement).toBe(cellOf(19))
			expect(box(cellOf(19)).top, 'ячейка — ниже шапки').toBeGreaterThanOrEqual(
				box(head()).bottom - EPSILON,
			)
		})
	})
})
