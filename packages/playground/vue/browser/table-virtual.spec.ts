/**
 * Окно Table (обёртка `Virtual`) в настоящем браузере: тело рисует только
 * видимые строки, а на месте остальных стоят распорки той же высоты.
 *
 * Что попадает в окно, считает ядро (`core/__tests__/table-virtual.spec.ts`),
 * замер — плагин (`plugins/__tests__/virtual.plugin.spec.ts`) над
 * подменёнными размерами. Здесь то, чего jsdom не считает: настоящая
 * прокрутка контейнера и страницы, шаг строк темы, фокус сетки в строке,
 * которой ещё не было в документе, и колесо, которое не уносит фокус.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TTableCollection, TTableRecord } from '@soldy-ui/core'
import { Table, Virtual } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

const COUNT = 1000

/** Несколько кадров: замер плагина, перерисовка окна и узлы новых строк. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/** Движок строк: `COUNT` записей, две колонки. */
function engineOf(options: { grid?: boolean } = {}): TTableCollection {
	const records: TTableRecord[] = Array.from({ length: COUNT }, (_, index) => ({
		id: index + 1,
		name: `Строка ${String(index + 1).padStart(4, '0')}`,
		age: index,
	}))
	const engine = createEngineTable({ items: records.map((data) => ({ data })) })

	engine.extensions.columns.columns = [
		{ field: 'name', text: 'Имя', rowHeader: true, sortable: true },
		{ field: 'age', text: 'Возраст' },
	]
	engine.extensions.selection.mode = 'multiple'
	engine.extensions.grid.grid = options.grid ?? false

	return engine
}

/**
 * Таблица в обёртке `Virtual` — в контейнере высотой 400 px с прокруткой, без
 * контейнера — прямо на странице.
 */
async function mount(engine: TTableCollection, container = true): Promise<HTMLElement> {
	const table = h(Virtual, () => h(Table, { engine, aria_label: 'Строки' }))

	render(
		defineComponent({
			render: () =>
				container
					? h('div', { class: 'scroll', style: 'height: 400px; overflow: auto' }, [table])
					: h('div', [table]),
		}),
	)

	await frames()

	return container ? find('.scroll') : scrollingElement()
}

function find(selector: string): HTMLElement {
	const node = document.querySelector(selector)

	if (!(node instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return node
}

function scrollingElement(): HTMLElement {
	const node = document.scrollingElement

	if (!(node instanceof HTMLElement)) throw new Error('у документа нет прокрутки')

	return node
}

/** Строки тела в документе. */
const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.s-table-row')]

/** Шаг строк — расстояние между верхами двух соседних нарисованных строк. */
function step(): number {
	const [first, second] = rows()

	return second.getBoundingClientRect().top - first.getBoundingClientRect().top
}

/** Номер строки, которая стоит в точке `y` окна браузера. */
function rowAt(y: number): string | null {
	const x = find('.s-table__body').getBoundingClientRect().left + 100

	return document.elementFromPoint(x, y)?.closest('tr')?.getAttribute('aria-rowindex') ?? null
}

afterEach(() => {
	cleanup()
	scrollingElement().scrollTop = 0
})

describe.each([
	['в контейнере', true],
	['на странице', false],
])('%s', (_name, container) => {
	it('в документе — только окно, а тело высотой во все строки', async () => {
		await mount(engineOf(), container)

		const drawn = rows().length
		const body = find('.s-table__body').getBoundingClientRect()

		expect(drawn).toBeGreaterThan(0)
		expect(drawn).toBeLessThan(80)
		expect(Math.abs(body.height - COUNT * step())).toBeLessThanOrEqual(EPSILON)
		expect(find('table.s-table').getAttribute('aria-rowcount')).toBe(String(COUNT + 1))
	})

	it('прокрутка: у края — строка своего места, и окно её не сдвигает', async () => {
		const scroller = await mount(engineOf(), container)
		const body = find('.s-table__body')
		const rowStep = step()

		// Верх тела у верха окна прокрутки — плюс полстроки, на строку 500
		scroller.scrollTop +=
			body.getBoundingClientRect().top - scroller.getBoundingClientRect().top
		scroller.scrollTop += 499 * rowStep

		const edge = Math.max(scroller.getBoundingClientRect().top, 0) + rowStep / 2

		await frames()

		const before = scroller.scrollTop

		// Место 499 — строка 500, её номер с шапкой — 501
		expect(rowAt(edge)).toBe('501')

		await frames()

		expect(scroller.scrollTop).toBe(before)
		expect(rowAt(edge)).toBe('501')
	})
})

describe('сетка', () => {
	/** Ячейка заголовка строки — по номеру строки. */
	function cellOf(rowIndex: number): HTMLElement {
		return find(`.s-table-row[aria-rowindex="${rowIndex}"] > th`)
	}

	it('Ctrl+End — фокус в последней строке, которой не было в документе', async () => {
		await mount(engineOf({ grid: true }))
		await userEvent.click(cellOf(2))

		expect(rows().some((row) => row.getAttribute('aria-rowindex') === String(COUNT + 1))).toBe(
			false,
		)

		await userEvent.keyboard('{Control>}{End}{/Control}')
		await frames()

		const active = document.activeElement

		expect(active?.closest('tr')?.getAttribute('aria-rowindex')).toBe(String(COUNT + 1))
	})

	it('PageDown за окно — фокус на строке через страницу', async () => {
		await mount(engineOf({ grid: true }))
		await userEvent.click(cellOf(2))

		for (let page = 0; page < 10; page++) await userEvent.keyboard('{PageDown}')
		await frames()

		// Десять раз по десять строк: строка 101, номер с шапкой — 102
		expect(document.activeElement?.closest('tr')?.getAttribute('aria-rowindex')).toBe('102')
	})

	it('колесо уводит прокрутку от строки с фокусом и обратно — фокус на месте', async () => {
		const scroller = await mount(engineOf({ grid: true }))

		await userEvent.click(cellOf(3))

		const focused = document.activeElement

		scroller.scrollTop = scroller.scrollHeight
		await frames()

		expect(document.activeElement).toBe(focused)
		expect(focused?.isConnected).toBe(true)

		scroller.scrollTop = 0
		await frames()

		expect(document.activeElement).toBe(focused)
	})
})

describe('выбор и сортировка видят все строки', () => {
	it('«выбрать все» — все строки, а не только нарисованные', async () => {
		const engine = engineOf()

		await mount(engine)
		await userEvent.click(find('.s-table__select input'))

		expect(engine.extensions.selection.selected).toHaveLength(COUNT)
	})

	it('сортировка по убыванию — первой в окне идёт последняя строка', async () => {
		await mount(engineOf())
		await userEvent.click(find('.s-table-column__sort'))
		await userEvent.click(find('.s-table-column__sort'))
		await frames()

		const [first] = rows()

		expect(first.querySelector('th')?.textContent?.trim()).toBe(`Строка ${COUNT}`)
		expect(first.getAttribute('aria-rowindex')).toBe('2')
	})
})
