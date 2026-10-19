/**
 * Table и окно `<so-virtual>` Web Components в настоящем браузере.
 *
 * Разметку, наборы ядра и данные, которые находят копии образцов, сторожат
 * `ui/webc/__tests__/table.spec.ts` и `virtual.spec.ts`. Здесь то, чего jsdom
 * не считает. Таблица Web Components стоит рядом с таблицей Vue, и тема даёт им
 * одни размеры: место под колонки плагин раскладки мерит по окну — элементу
 * таблицы `<div is="so-table">`, — и ядро раскладывает по нему колонки так же,
 * как у Vue. Окно `<so-virtual>` своей коробки не имеет, а таблица в нём рисует
 * только видимые строки: замер — настоящая прокрутка контейнера и шаг строк
 * темы. Разметку и окно таблицы Vue сторожат `table.spec.ts` и
 * `table-virtual.spec.ts` стенда.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h, nextTick } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TTableCollection, TTableColumnSource, TTableRecord } from '@soldy-ui/core'
import { Table } from '@soldy-ui/vue'
import { TTableElement, TVirtualElement, type TTableElementProps } from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

/** Несколько кадров: замер плагинов, перерисовка и узлы новых строк. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/** Узлы теста вне Vue — снимаются после каждого. */
const stages: HTMLElement[] = []

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	for (const stage of stages.splice(0)) stage.remove()
	cleanup()
})

/** Узел по селектору; нет его — тест падает здесь. */
function find(root: ParentNode, selector: string): HTMLElement {
	const node = root.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

/** Узлы по селектору — HTML-элементы. */
const all = (root: ParentNode, selector: string): HTMLElement[] =>
	[...root.querySelectorAll(selector)].filter(
		(node): node is HTMLElement => node instanceof HTMLElement,
	)

function isTable(node: Element): node is TTableElementProps {
	return node instanceof TTableElement
}

/** Таблица Web Components кодом: пропсы свойствами до вставки. */
function createTable(props: Record<string, unknown>): TTableElementProps {
	const el = document.createElement('div', { is: 'so-table' })

	if (!isTable(el)) throw new Error('<div is="so-table"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(el, name, value)

	return el
}

/** Узел стенда вне Vue: блок со своим стилем на странице. */
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

/** Размер узла на странице. */
function size(node: Element) {
	const { width, height } = node.getBoundingClientRect()

	return { width: Math.round(width), height: Math.round(height) }
}

describe('раскладка — как у Vue', () => {
	/**
	 * Колонки без своей ширины раскладывает ядро по месту окна. У Web Components
	 * окно — сам элемент таблицы, и плагин раскладки находит его родителем
	 * корня `table`: колонки делят ту же ширину, что у Vue, и таблица во всю
	 * ширину места.
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
		await frames()

		const webc = stages[0]

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

	/** Движок строк: `COUNT` записей, две колонки. */
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

	/** Таблица в окне — в контейнере высотой 400 px с прокруткой. */
	async function mount(engine: TTableCollection): Promise<HTMLElement> {
		const scroller = stage('height: 400px; overflow: auto')
		const virtual = document.createElement('so-virtual')

		if (!(virtual instanceof TVirtualElement)) throw new Error('<so-virtual> нет')

		virtual.appendChild(createTable({ engine, aria_label: 'Строки' }))
		scroller.appendChild(virtual)
		await frames()

		return scroller
	}

	/** Строки тела в документе. */
	const rows = (): HTMLElement[] => all(document, '.so-table-row')

	/** Шаг строк — расстояние между верхами двух соседних нарисованных строк. */
	function step(): number {
		const [first, second] = rows()

		return second.getBoundingClientRect().top - first.getBoundingClientRect().top
	}

	/** Номер строки, которая стоит в точке `y` окна браузера. */
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

		// Верх тела у верха окна прокрутки — плюс полстроки, на строку 500
		scroller.scrollTop +=
			body.getBoundingClientRect().top - scroller.getBoundingClientRect().top
		scroller.scrollTop += 499 * rowStep

		const edge = scroller.getBoundingClientRect().top + rowStep / 2

		await frames()

		const before = scroller.scrollTop

		// Место 499 — строка 500, её номер с шапкой — 501
		expect(rowAt(edge)).toBe('501')

		await frames()

		expect(scroller.scrollTop).toBe(before)
		expect(rowAt(edge)).toBe('501')
	})
})
