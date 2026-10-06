/**
 * Table в настоящем браузере: раскладка колонок, линии строк, ручка ширины и
 * выбранная строка в принудительных цветах — тема.
 *
 * Колонки, ячейки, сортировку и выбор считает ядро
 * (`core/__tests__/table*.spec.ts`), разметку — адаптер
 * (`ui/vue/__tests__/table.spec.ts`). Здесь то, чего jsdom не считает вовсе:
 * ширины, коробки текста, имена в дереве доступности и цвета. Как таблица
 * лежит, решает тема (`themes/oren/src/components/table/_table.scss`):
 * раскладка фиксированная, колонка с шириной — ровно её, колонка без ширины —
 * не уже распорки в заголовке, линии — рамки строк, а не ячеек: под шапкой —
 * цвета рамки `outlined`, под строкой — тише неё, — и выбранная строка в
 * режиме принудительных цветов — системной подсветкой.
 *
 * Ручку ширины тянет настоящий ввод Playwright: только так видно, что захват
 * указателя доводит протяжку за полосой до заголовка, а стрелка делает ровно
 * один шаг — ядра, без нативного шага поля.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	TTableCollection,
	TTableColumnSource,
	TTableRecord,
} from '@soldy-ui/core'
import { Button, Table } from '@soldy-ui/vue'

import { find, pixel, settled, shift, style, systemColor } from './colors'
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

/** Таблица в контейнере заданной ширины и направления письма. */
async function mount(
	engine: TTableCollection,
	width = 600,
	dir: 'ltr' | 'rtl' = 'ltr',
): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: `width: ${width}px` }, [
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

	/**
	 * Цвет линий. Под шапкой — граница: та же ступень, что у рамки `outlined`
	 * у Button. Под строкой — тише шапки: вуаль нейтрали плотности заливки
	 * `filled`, на шаг от того, на чём таблица стоит. Ступенью 400 линия шапки
	 * горела ярче любой рамки рядом, а линию строки тише границы ступень не
	 * даёт: 200 на поверхности контрола тёмной схемы — сама поверхность.
	 *
	 * Палитры тест не знает, как и сторож видов Button (`button-view.spec.ts`):
	 * линию шапки он сверяет с рамкой кнопки рядом, а линию строки меряет —
	 * насколько она ушла от подложки в сторону текста ячейки.
	 */
	describe('цвет', () => {
		/** Обе схемы: правило у них общее, а подложки разные. */
		const SCHEMES = ['oren', 'oren-dark'] as const

		type TScheme = (typeof SCHEMES)[number]

		/**
		 * Где стоит таблица: на странице и на поверхности контрола — в карточке,
		 * в панели Popover и Dialog.
		 */
		const BACKDROPS = {
			страница: 'var(--s-neutral-50)',
			'поверхность контрола': 'var(--s-component-surface)',
		} as const

		type TBackdrop = keyof typeof BACKDROPS

		const CASES = SCHEMES.flatMap((scheme) =>
			(Object.keys(BACKDROPS) as TBackdrop[]).map((backdrop) => ({ scheme, backdrop })),
		)

		/**
		 * Порог заметности линии строки по светлоте OKLab — тот же, что у
		 * нейтральной заливки `filled` у Button: линия — вуаль той же плотности.
		 */
		const VISIBLE_LINE = 0.02

		afterEach(() => {
			delete document.documentElement.dataset.theme
		})

		/**
		 * Сцена: на каждой подложке — таблица и кнопка `outlined` рядом.
		 * Указатель уведён: под ним рамка кнопки сильнее.
		 */
		async function showLines(scheme: TScheme): Promise<void> {
			document.documentElement.dataset.theme = scheme
			render(
				defineComponent({
					render: () =>
						h('div', [
							h('div', { class: 's-test-away', style: 'height: 24px' }),
							...Object.entries(BACKDROPS).map(([name, color]) =>
								h(
									'div',
									{
										key: name,
										'data-backdrop': name,
										style: `background: ${color}; padding: 8px`,
									},
									[
										h(Table, { engine: engineOf(), aria_label: 'Сотрудники' }),
										h(Button, { view: 'outlined', text: 'Рамка' }),
									],
								),
							),
						]),
				}),
			)

			await new Promise((resolve) => requestAnimationFrame(resolve))
			await userEvent.hover(find('.s-test-away'))
			await settled(document.body)
		}

		/** Части сцены на подложке: подложка, строка шапки, строка тела, её ячейка и кнопка. */
		const partsOf = (backdrop: TBackdrop) => {
			const root = find(`[data-backdrop="${backdrop}"]`)

			return {
				root,
				head: find('.s-table__head-row', root),
				row: find('.s-table-row', root),
				cell: find('.s-table-row__cell', root),
				button: find('.s-button--view-outlined', root),
			}
		}

		/** Насколько линия ушла от подложки в сторону текста ячейки; минус — за подложку. */
		function away(line: Element, backdrop: TBackdrop): number {
			const { root, cell } = partsOf(backdrop)
			const under = style(root).backgroundColor

			return (
				shift(style(line).borderBottomColor, under) *
				Math.sign(shift(style(cell).color, under))
			)
		}

		it.each(CASES)(
			'$scheme, $backdrop: линия шапки — цвета рамки outlined',
			async (scenario) => {
				await showLines(scenario.scheme)

				const { head, button } = partsOf(scenario.backdrop)

				expect(pixel([style(head).borderBottomColor])).toEqual(
					pixel([style(button).borderTopColor]),
				)
			},
		)

		it.each(CASES)(
			'$scheme, $backdrop: линия строки уходит от подложки к тексту и тише шапки',
			async (scenario) => {
				await showLines(scenario.scheme)

				const { head, row } = partsOf(scenario.backdrop)
				const line = away(row, scenario.backdrop)

				expect(line).toBeGreaterThan(VISIBLE_LINE)
				expect(line).toBeLessThan(away(head, scenario.backdrop))
			},
		)

		/**
		 * Линия строки — вуаль, то есть цвет с прозрачностью. Фону браузер в этом
		 * режиме прозрачность оставляет, и линия, которую он красил бы так же,
		 * пропала бы. Она обязана стать цветом текста системы, как рамки,
		 * которые браузер красит сам.
		 */
		describe('принудительные цвета', () => {
			it.each(SCHEMES)('%s: линия строки — цветом текста системы', async (scheme) => {
				await forcedColors('active')
				await showLines(scheme)

				const { row } = partsOf('страница')

				expect(pixel([style(row).borderBottomColor])).toEqual(
					pixel([systemColor('CanvasText')]),
				)
			})
		})
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

/**
 * Ручка ширины — полоса у конца заголовка с полем `input type="range"`.
 *
 * Протяжку ведёт плагин, ширину считает ядро, а раскладка — тема: здесь
 * видно, что край колонки идёт за указателем ровно на сдвиг, в LTR и в RTL,
 * соседи с шириной стоят на месте, а имя заголовка и ползунка — ровно текст
 * колонки, без значения поля.
 *
 * Таблица — в месте не шире окна прогона (414 px): протяжка за край окна
 * прокрутила бы страницу, и сдвиг указателя разошёлся бы со сдвигом края.
 */
describe('ручка ширины', () => {
	const PLACE = 400

	const NAME_RESIZE: TTableColumnSource = {
		...NAME,
		resizable: true,
		width: 120,
		minWidth: 80,
		maxWidth: 300,
	}
	const CITY_RESIZE: TTableColumnSource = { ...CITY, resizable: true }
	const AGE_RESIZE: TTableColumnSource = { ...AGE, resizable: true, width: 100 }
	const ALL = [NAME_RESIZE, CITY_RESIZE, AGE_RESIZE]

	/** Движок без колонки выбора: ширины шапки — только колонки данных. */
	function resizeEngine(columns: readonly TTableColumnSource[]): TTableCollection {
		const engine = engineOf(columns)

		engine.extensions.selection.mode = 'none'

		return engine
	}

	/** Колонка коллекции по полю. */
	function columnOf(engine: TTableCollection, field: string): ITableColumn {
		const found = engine.extensions.columns.columns.find((column) => column.field === field)

		if (!found) throw new Error(`колонки ${field} нет`)

		return found
	}

	const width = (element: Element) => element.getBoundingClientRect().width

	/** Полоса ручки в заголовке. */
	const resizerOf = (header: Element) => find('.s-table-column__resizer', header)

	/** Поле ручки в заголовке. */
	function fieldOf(header: Element): HTMLInputElement {
		const field = resizerOf(header).querySelector('input')

		if (!field) throw new Error('поля ручки нет')

		return field
	}

	/**
	 * Указатель в точку страницы. Наводится на `body`: точка протяжки лежит за
	 * полосой, и наведение на саму полосу Playwright не принял бы.
	 */
	async function pointAt(x: number, y: number): Promise<void> {
		const body = document.body.getBoundingClientRect()

		await userEvent.hover(document.body, { position: { x: x - body.left, y: y - body.top } })
	}

	/** Протяжка ручки заголовка: нажатие в центре полосы, сдвиг по оси окна, отпускание. */
	async function drag(header: Element, dx: number): Promise<void> {
		const box = resizerOf(header).getBoundingClientRect()
		const x = box.left + box.width / 2
		const y = box.top + box.height / 2

		await pointAt(x, y)
		await commands.mouseDown()

		try {
			await pointAt(x + dx / 2, y)
			await pointAt(x + dx, y)
		} finally {
			await commands.mouseUp()
		}
	}

	it('протяжка на Δ — колонка шире на Δ; отпускание — один commit', async () => {
		const engine = resizeEngine(ALL)
		const name = columnOf(engine, 'name')
		const commits: number[] = []

		name.events.on('commit', (value) => commits.push(value))
		await mount(engine, PLACE)

		const [header] = headers()

		await drag(header, 40)

		expect(Math.abs(width(header) - 160)).toBeLessThanOrEqual(EPSILON)
		expect(name.width).toBe(160)
		expect(commits).toEqual([160])
		expect(header.dataset.resizing).toBe('false')
	})

	it('RTL: ручка у левого края заголовка — колонку расширяет протяжка влево', async () => {
		const engine = resizeEngine(ALL)

		await mount(engine, PLACE, 'rtl')

		const [header] = headers()
		const resizer = resizerOf(header).getBoundingClientRect()
		const left = header.getBoundingClientRect().left

		// Полоса — на границе колонок, у левого края заголовка
		expect(Math.abs(resizer.left + resizer.width / 2 - left)).toBeLessThanOrEqual(EPSILON)

		await drag(header, -40)

		expect(Math.abs(width(header) - 160)).toBeLessThanOrEqual(EPSILON)
		expect(columnOf(engine, 'name').width).toBe(160)
	})

	it('протяжка — в границах колонки', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const [header] = headers()

		await drag(header, 240)

		expect(Math.abs(width(header) - 300)).toBeLessThanOrEqual(EPSILON)
	})

	it('колонка без своей ширины: ручка — с замером, протяжка — от ширины, которую видно', async () => {
		await mount(resizeEngine([CITY_RESIZE, AGE_RESIZE]), PLACE)

		const [header] = headers()

		// Ширину решает тема, и ручка ждёт замера — кадром позже наблюдателя
		await expect.poll(() => header.querySelector('.s-table-column__resizer')).not.toBeNull()

		const before = width(header)

		await drag(header, -30)

		expect(Math.abs(width(header) - (before - 30))).toBeLessThanOrEqual(EPSILON)
		expect(header.dataset.sized).toBe('true')
	})

	it('ширина у всех колонок — таблица шириной в их сумму, соседи на месте', async () => {
		await mount(resizeEngine([NAME_RESIZE, { ...CITY_RESIZE, width: 150 }, AGE_RESIZE]), PLACE)

		const table = find('.s-table')
		const [name, city, age] = headers()

		// Излишек места колонкам не раздаётся: таблица — сумма их ширин
		expect(Math.abs(width(table) - 370)).toBeLessThanOrEqual(EPSILON)

		const cityLeft = city.getBoundingClientRect().left

		await drag(name, 20)

		expect(Math.abs(width(name) - 140)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(city) - 150)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(age) - 100)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(table) - 390)).toBeLessThanOrEqual(EPSILON)
		// Соседа сдвинул край колонки — ровно на её прибавку
		expect(Math.abs(city.getBoundingClientRect().left - (cityLeft + 20))).toBeLessThanOrEqual(
			EPSILON,
		)
	})

	it('клавиши: стрелка — ровно один шаг ядра, Shift — крупный, Home и End — края', async () => {
		const engine = resizeEngine(ALL)

		await mount(engine, PLACE)

		const [header] = headers()
		const field = fieldOf(header)

		field.focus()
		await userEvent.keyboard('{ArrowRight}')

		expect(columnOf(engine, 'name').width).toBe(130)
		await expect.poll(() => field.value).toBe('130')
		expect(Math.abs(width(header) - 130)).toBeLessThanOrEqual(EPSILON)

		await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}')

		expect(columnOf(engine, 'name').width).toBe(230)

		await userEvent.keyboard('{End}')

		expect(columnOf(engine, 'name').width).toBe(300)

		await userEvent.keyboard('{Home}')

		expect(columnOf(engine, 'name').width).toBe(80)
	})

	it('клавиши в RTL: ← — шире', async () => {
		const engine = resizeEngine(ALL)

		await mount(engine, PLACE, 'rtl')

		fieldOf(headers()[0]).focus()
		await userEvent.keyboard('{ArrowLeft}')

		expect(columnOf(engine, 'name').width).toBe(130)
	})

	it('имя заголовка и ползунка ручки — ровно текст колонки, без значения поля', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const [name, city] = headers()

		expect(page.getByRole('columnheader', { name: 'Имя', exact: true }).query()).toBe(name)
		expect(page.getByRole('columnheader', { name: 'Город', exact: true }).query()).toBe(city)
		expect(page.getByRole('slider', { name: 'Имя', exact: true }).query()).toBe(fieldOf(name))
		// Сортирует по-прежнему кнопка с тем же именем
		expect(page.getByRole('button', { name: 'Имя', exact: true }).query()).toBe(
			find('.s-table-column__sort', name),
		)
	})

	it('полоса — зона захвата не уже 24 px; у последней колонки — в таблице', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const table = find('.s-table').getBoundingClientRect()
		const [name, , age] = headers()

		expect(width(resizerOf(name))).toBeGreaterThanOrEqual(24 - EPSILON)
		expect(width(resizerOf(age))).toBeGreaterThanOrEqual(24 - EPSILON)
		expect(resizerOf(age).getBoundingClientRect().right).toBeLessThanOrEqual(
			table.right + EPSILON,
		)

		// На самой границе колонок — полоса
		const edge = name.getBoundingClientRect()
		const hit = document.elementFromPoint(edge.right, edge.top + edge.height / 2)

		expect(resizerOf(name).contains(hit)).toBe(true)
	})

	it('кнопка сортировки у полосы нажимается: где они встречаются, нажатие — кнопке', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const age = headers()[2]
		const button = find('.s-table-column__sort', age)
		const box = button.getBoundingClientRect()
		const resizer = resizerOf(age).getBoundingClientRect()

		// Полоса последней колонки заходит на её кнопку, прижатую к концу
		expect(resizer.left).toBeLessThan(box.right)

		const x = (Math.max(box.left, resizer.left) + box.right) / 2
		const y = box.top + box.height / 2

		expect(button.contains(document.elementFromPoint(x, y))).toBe(true)

		const body = document.body.getBoundingClientRect()

		await userEvent.click(document.body, { position: { x: x - body.left, y: y - body.top } })

		await expect.poll(() => age.dataset.sort).toBe('asc')
		expect(Math.abs(width(age) - 100)).toBeLessThanOrEqual(EPSILON)
	})

	it('линия — под наведением; в принудительных цветах — системным цветом фокуса', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const resizer = resizerOf(headers()[0])
		const line = () => style(resizer, '::before')

		expect(line().opacity).toBe('0')

		const box = resizer.getBoundingClientRect()

		await pointAt(box.left + box.width / 2, box.top + box.height / 2)
		await expect.poll(() => line().opacity).toBe('1')

		await forcedColors('active')

		expect(pixel([line().backgroundColor])).toEqual(pixel([systemColor('Highlight')]))
	})
})
