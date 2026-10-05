/**
 * Table в настоящем браузере: раскладка колонок, линии строк и выбранная
 * строка в принудительных цветах — тема.
 *
 * Колонки, ячейки, сортировку и выбор считает ядро
 * (`core/__tests__/table*.spec.ts`), разметку — адаптер
 * (`ui/vue/__tests__/table.spec.ts`). Здесь то, чего jsdom не считает вовсе:
 * ширины, коробки текста и цвета. Как таблица лежит, решает тема
 * (`themes/oren/src/components/table/_table.scss`): раскладка фиксированная,
 * колонка с шириной — ровно её, колонка без ширины — не уже распорки в
 * заголовке, линии — рамки строк, а не ячеек, и выбранная строка в режиме
 * принудительных цветов — системной подсветкой.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TTableCollection, TTableColumnSource, TTableRecord } from '@soldy-ui/core'
import { Table } from '@soldy-ui/vue'

import { find, pixel, style, systemColor } from './colors'
import { forcedColors } from './media'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

const RECORDS = [
	{ id: 1, name: 'Анна Смирнова', city: 'Казань', age: 30 },
	{ id: 2, name: 'Борис Петров', city: 'Омск', age: 41 },
	{ id: 3, name: 'Вера Иванова', city: 'Тверь', age: 25 },
]

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true, sortable: true }
const CITY: TTableColumnSource = { field: 'city', text: 'Город' }
const AGE: TTableColumnSource = {
	field: 'age',
	text: 'Возраст',
	align: 'end',
	width: 120,
	sortable: true,
}

/** Движок строк с записями и колонками: через него тест выбирает и выключает строки. */
function engineOf(columns: readonly TTableColumnSource[] = [NAME, CITY, AGE]): TTableCollection {
	const engine = createEngineTable({
		items: RECORDS.map((data: TTableRecord) => ({ data })),
	})

	engine.extensions.columns.columns = columns
	engine.extensions.selection.mode = 'multiple'

	return engine
}

/** Таблица в контейнере заданной ширины. */
async function mount(engine: TTableCollection, width = 600): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { style: `width: ${width}px` }, [
					h(Table, { engine, aria_label: 'Сотрудники' }),
				]),
		}),
	)

	await new Promise((resolve) => requestAnimationFrame(resolve))
}

/** Заголовки колонок шапки — по порядку. */
const headers = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.s-table-column')]

/** Строки тела — по порядку. */
const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.s-table-row')]

/**
 * Коробка текста узла — не узла: подпись в кнопке и значение в ячейке стоят в
 * своих полях, и вровень должны стоять буквы, а не коробки.
 */
function textBox(element: Element): DOMRect {
	const range = document.createRange()

	range.selectNodeContents(element)

	return range.getBoundingClientRect()
}

afterEach(async () => {
	cleanup()
	await forcedColors('none')
})

describe('ширина колонок', () => {
	it('колонка с шириной — ровно её, остальные делят оставшееся место', async () => {
		await mount(engineOf())

		const [name, city, age] = headers()
		const table = find('.s-table')

		expect(Math.abs(age.getBoundingClientRect().width - 120)).toBeLessThanOrEqual(EPSILON)
		// Таблица во всю ширину места, и колонки без ширины делят остаток поровну
		expect(Math.abs(table.getBoundingClientRect().width - 600)).toBeLessThanOrEqual(EPSILON)
		expect(
			Math.abs(name.getBoundingClientRect().width - city.getBoundingClientRect().width),
		).toBeLessThanOrEqual(EPSILON)
	})

	it('колонка без ширины в тесном месте не уже распорки — таблица шире места', async () => {
		await mount(engineOf(), 200)

		const [name] = headers()
		const table = find('.s-table')
		const strut = parseFloat(style(name).fontSize) * 10

		expect(name.getBoundingClientRect().width).toBeGreaterThanOrEqual(strut)
		expect(table.getBoundingClientRect().width).toBeGreaterThan(200)
	})
})

describe('подпись шапки вровень с текстом ячеек', () => {
	it('колонка по началу: подпись кнопки сортировки — над началом текста ячеек', async () => {
		await mount(engineOf())

		const header = find('.s-table-column__sort .s-button__text', headers()[0])
		const cell = rows()[0].querySelector('th')

		if (!cell) throw new Error('заголовка строки нет')

		expect(Math.abs(textBox(header).left - textBox(cell).left)).toBeLessThanOrEqual(EPSILON)
	})

	it('колонка по концу: подпись — над концом чисел', async () => {
		await mount(engineOf())

		const header = find('.s-table-column__sort .s-button__text', headers()[2])
		const cell = rows()[0].children[3]

		expect(Math.abs(textBox(header).right - textBox(cell).right)).toBeLessThanOrEqual(EPSILON)
	})

	it('несортируемая колонка: текст заголовка — над текстом ячеек', async () => {
		await mount(engineOf())

		const header = find('.s-table-column__text', headers()[1])
		const cell = rows()[0].children[2]

		expect(Math.abs(textBox(header).left - textBox(cell).left)).toBeLessThanOrEqual(EPSILON)
	})
})

describe('линии строк', () => {
	/**
	 * Выключенная строка гасит ячейки с данными. Линию под строкой рисует сама
	 * строка — рамкой в модели слитых границ, — и ячейки её не гасят: погасни
	 * линия вместе с ячейками, она шла бы бледной под данными и целой под
	 * чекбоксом.
	 */
	it('под выключенной строкой линия та же, что под соседней', async () => {
		const engine = engineOf()

		engine.extensions.batch.items[1].disabled = true
		await mount(engine)

		const [enabled, disabled] = rows()
		const cell = disabled.querySelector('.s-table-row__cell')

		if (!cell) throw new Error('ячейки нет')

		expect(parseFloat(style(cell).opacity)).toBeLessThan(1)
		expect(style(disabled).opacity).toBe('1')
		expect(style(disabled).borderBottomStyle).toBe('solid')
		expect(pixel([style(disabled).borderBottomColor])).toEqual(
			pixel([style(enabled).borderBottomColor]),
		)
	})
})

describe('принудительные цвета', () => {
	it('выбранная строка — системной подсветкой', async () => {
		const engine = engineOf()

		engine.extensions.selection.select(engine.extensions.batch.items[0])
		await mount(engine)
		await forcedColors('active')

		const selected = rows()[0]

		expect(pixel([style(selected).backgroundColor])).toEqual(pixel([systemColor('Highlight')]))
		expect(pixel([style(selected).color])).toEqual(pixel([systemColor('HighlightText')]))
	})
})
