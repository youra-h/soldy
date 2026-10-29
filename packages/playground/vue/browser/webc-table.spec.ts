/**
 * Table and the `<so-virtual>` window of Web Components in a real browser.
 *
 * The markup, the core's sets and the data the copies of the samples find are
 * guarded by `ui/webc/__tests__/table.spec.ts` and `virtual.spec.ts`. Here is
 * what jsdom doesn't compute. The Web Components table stands next to the Vue
 * table, and the theme gives them the same sizes: the layout plugin measures the
 * place for the columns by the window — the table's element
 * `<div is="so-table">`, — and the core lays the columns out by it as for Vue.
 * The `<so-virtual>` window has no box of its own, and the table in it draws
 * only the visible rows: the measure is a real scroll of the container and the
 * theme's row step. The stand's `table.spec.ts` and `table-virtual.spec.ts`
 * guard the markup and the window of the Vue table.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { defineComponent, h, nextTick } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TTableCollection, TTableColumnSource, TTableRecord } from '@soldy-ui/core'
import { Table } from '@soldy-ui/vue'
import { TTableElement, TVirtualElement, type TTableElementProps } from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

/** Tolerance for subpixel rounding, px. */
const EPSILON = 1

/** A few frames: the plugins' measures, the repaint and the new rows' nodes. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/** The test's nodes outside Vue — removed after each one. */
const stages: HTMLElement[] = []

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	for (const stage of stages.splice(0)) stage.remove()
	cleanup()
})

/** A node by its selector; without it the test fails here. */
function find(root: ParentNode, selector: string): HTMLElement {
	const node = root.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

/** Nodes by a selector — HTML elements. */
const all = (root: ParentNode, selector: string): HTMLElement[] =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

function isTable(node: Element): node is TTableElementProps {
	return node instanceof TTableElement
}

/** A Web Components table built by code: the props as properties before the insertion. */
function createTable(props: Record<string, unknown>): TTableElementProps {
	const el = document.createElement('div', { is: 'so-table' })

	if (!isTable(el)) throw new Error('<div is="so-table"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	return el
}

/** A stand node outside Vue: a block with its own style on the page. */
function stage(style: string): HTMLElement {
	const node = document.createElement('div')

	node.style.cssText = style
	document.body.appendChild(node)
	stages.push(node)

	return node
}

const COLUMNS: readonly TTableColumnSource[] = [
	{ field: 'name', text: 'Имя', rowHeader: true, sortable: true, resizable: true },
	{ field: 'city', text: 'Город', sortable: true },
	{ field: 'age', text: 'Возраст', align: 'end', width: 120, minWidth: 80 },
]

const ITEMS = [
	{ data: { id: 1, name: 'Анна', city: 'Москва', age: 30 } },
	{ data: { id: 2, name: 'Борис', city: 'Казань', age: 41 } },
]

/** A node's size on the page. */
function size(node: Element) {
	const { width, height } = node.getBoundingClientRect()

	return { width: Math.round(width), height: Math.round(height) }
}

describe('раскладка — как у Vue', () => {
	/**
	 * The core lays out the columns without a width of their own by the window's
	 * place. In Web Components the window is the table's element itself, and the
	 * layout plugin finds it as the parent of the `table` root: the columns share
	 * the same width as in Vue, and the table is as wide as the place.
	 */
	it('окно, таблица, заголовки и ячейки — тех же размеров', async () => {
		const BOX = 'width: 640px'

		render(
			defineComponent({
				render: () =>
					h('div', { class: 'vue', style: BOX }, [
						h(Table, { items: ITEMS, columns: COLUMNS, mode: 'multiple' }),
					]),
			}),
		)
		await nextTick()

		stage(BOX).appendChild(createTable({ items: ITEMS, columns: COLUMNS, mode: 'multiple' }))

		const webc = stages[0]

		// Both tables laid out: until the core's layout the theme decides the
		// widths, and the first layout counts on the selection column as wide as
		// it was then — the plugin measures it again once the table has settled
		for (const root of [document.querySelector('.vue'), webc]) {
			if (!root) throw new Error('no table place')

			const table = find(root, 'table.so-table')

			await expect
				.poll(
					() =>
						table.dataset.sized === 'true' &&
						Math.abs(table.getBoundingClientRect().width - 640) <= EPSILON,
				)
				.toBe(true)
		}

		for (const part of [
			'.so-table__viewport',
			'table.so-table',
			'.so-table__select',
			'.so-table-column',
			'.so-table-row',
			'.so-table-row__cell',
			'.so-table-row__select',
			'.so-table-column__sort',
		]) {
			const vue = all(document, `.vue ${part}`).map(size)

			expect(vue.length, part).toBeGreaterThan(0)
			expect(all(webc, part).map(size), part).toEqual(vue)
		}

		const table = find(webc, 'table.so-table')

		expect(table.dataset.sized).toBe('true')
		expect(table.dataset.overflow).toBe('false')
		expect(Math.abs(table.getBoundingClientRect().width - 640)).toBeLessThanOrEqual(EPSILON)
	})
})

describe('окно <so-virtual>', () => {
	const COUNT = 1000

	/** A row engine: `COUNT` records, two columns. */
	function engineOf(): TTableCollection {
		const records: TTableRecord[] = Array.from({ length: COUNT }, (_, index) => ({
			id: index + 1,
			name: `Строка ${String(index + 1).padStart(4, '0')}`,
			age: index,
		}))
		const engine = createEngineTable({ items: records.map((data) => ({ data })) })

		engine.extensions.columns.columns = [
			{ field: 'name', text: 'Имя', rowHeader: true },
			{ field: 'age', text: 'Возраст' },
		]

		return engine
	}

	/** A table in the window — in a scrolling container 400 px high. */
	async function mount(engine: TTableCollection): Promise<HTMLElement> {
		const scroller = stage('height: 400px; overflow: auto')
		const virtual = document.createElement('so-virtual')

		if (!(virtual instanceof TVirtualElement)) throw new Error('<so-virtual> нет')

		virtual.appendChild(createTable({ engine, aria_label: 'Строки' }))
		scroller.appendChild(virtual)
		await frames()

		return scroller
	}

	/** The body's rows in the document. */
	const rows = (): HTMLElement[] => all(document, '.so-table-row')

	/** The row step — the distance between the tops of two neighbouring drawn rows. */
	function step(): number {
		const [first, second] = rows()

		return second.getBoundingClientRect().top - first.getBoundingClientRect().top
	}

	/** The number of the row standing at the point `y` of the browser window. */
	function rowAt(y: number): string | null {
		const x = find(document, '.so-table__body').getBoundingClientRect().left + 100

		return document.elementFromPoint(x, y)?.closest('tr')?.getAttribute('aria-rowindex') ?? null
	}

	it('своей коробки у окна нет: таблица стоит в контейнере, как без него', async () => {
		const scroller = await mount(engineOf())
		const virtual = find(scroller, 'so-virtual')
		const viewport = find(scroller, '.so-table__viewport')

		expect(getComputedStyle(virtual).display).toBe('contents')
		expect(viewport.getBoundingClientRect().width).toBe(scroller.clientWidth)
		expect(viewport.getBoundingClientRect().top).toBe(scroller.getBoundingClientRect().top)
	})

	it('в документе — только окно, а тело высотой во все строки', async () => {
		await mount(engineOf())

		const drawn = rows().length
		const body = find(document, '.so-table__body').getBoundingClientRect()

		expect(drawn).toBeGreaterThan(0)
		expect(drawn).toBeLessThan(80)
		expect(Math.abs(body.height - COUNT * step())).toBeLessThanOrEqual(EPSILON)
		expect(find(document, 'table.so-table').getAttribute('aria-rowcount')).toBe(
			String(COUNT + 1),
		)
	})

	it('прокрутка: у края — строка своего места, и окно её не сдвигает', async () => {
		const scroller = await mount(engineOf())
		const body = find(document, '.so-table__body')
		const rowStep = step()

		// The body's top at the scroll window's top — plus half a row, onto row 500
		scroller.scrollTop +=
			body.getBoundingClientRect().top - scroller.getBoundingClientRect().top
		scroller.scrollTop += 499 * rowStep

		const edge = scroller.getBoundingClientRect().top + rowStep / 2

		await frames()

		const before = scroller.scrollTop

		// Place 499 is row 500, its number with the head is 501
		expect(rowAt(edge)).toBe('501')

		await frames()

		expect(scroller.scrollTop).toBe(before)
		expect(rowAt(edge)).toBe('501')
	})
})
