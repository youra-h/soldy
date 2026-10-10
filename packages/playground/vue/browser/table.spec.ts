/**
 * Table в настоящем браузере: раскладка колонок, линии строк, ручка ширины и
 * выбранная строка в принудительных цветах — тема.
 *
 * Колонки, ячейки, сортировку, выбор и ширины колонок по месту считает ядро
 * (`core/__tests__/table*.spec.ts`), разметку — адаптер
 * (`ui/vue/__tests__/table.spec.ts`). Здесь то, чего jsdom не считает вовсе:
 * ширины, коробки текста, имена в дереве доступности и цвета. Место под
 * колонки — ширину окна таблицы — мерит плагин раскладки, а как таблица
 * лежит, решает тема (`themes/oren/src/components/table/_table.scss`):
 * раскладка фиксированная, колонка с шириной — ровно её, таблица с
 * известными ширинами — их сумма, окно прокручивает таблицу шире места, до
 * замера колонка без ширины — не уже распорки в заголовке, линии — рамки
 * строк, а не ячеек: под шапкой — цвета рамки `outlined`, под строкой — тише
 * неё, — и выбранная строка в режиме принудительных цветов — системной
 * подсветкой.
 *
 * Ручку ширины тянет настоящий ввод Playwright: только так видно, что захват
 * указателя доводит протяжку за полосой до заголовка, а стрелка делает ровно
 * один шаг — ядра, без нативного шага поля.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { commands, page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	TTableCollection,
	TTableColumnSource,
	TTableRecord,
} from '@soldy-ui/core'
import { useMotion } from '@soldy-ui/plugins'
import { Button, Table } from '@soldy-ui/vue'

import { find, opacity, pixel, settled, shift, style, systemColor } from './colors'
import { forcedColors } from './media'
import { transitionRuns, transitioning } from './transitions'

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
	props: Record<string, unknown> = {},
): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { dir, style: `width: ${width}px` }, [
					h(Table, { engine, aria_label: 'Сотрудники', ...props }),
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

/** Ширина узла. */
const width = (element: Element) => element.getBoundingClientRect().width

/** Окно таблицы — узел вокруг неё, который прокручивается вбок. */
const viewport = () => find('.s-table__viewport')

/**
 * Указатель в точку страницы. Наводится на `body`: точка протяжки лежит за
 * полосой, а то и за таблицей, и наведение на сам узел Playwright не принял бы.
 */
async function pointAt(x: number, y: number): Promise<void> {
	const body = document.body.getBoundingClientRect()

	await userEvent.hover(document.body, { position: { x: x - body.left, y: y - body.top } })
}

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

/** Полоса ручки в заголовке. */
const resizerOf = (header: Element) => find('.s-table-column__resizer', header)

/** Поле ручки в заголовке. */
function fieldOf(header: Element): HTMLInputElement {
	const field = resizerOf(header).querySelector('input')

	if (!field) throw new Error('поля ручки нет')

	return field
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

afterEach(async () => {
	cleanup()
	await forcedColors('none')
})

/**
 * Ширины колонок раскладывает ядро — по месту окна таблицы и её `columnFit`
 * (`core/__tests__/table-layout.spec.ts`), место мерит плагин кадром позже
 * монтирования, поэтому раскладку тест ждёт опросом. Тема кладёт ширины в
 * заголовки и, когда известны все, ставит таблицу шириной в их сумму.
 */
describe('ширина колонок', () => {
	it('колонка с шириной — ровно её, остальные делят оставшееся место', async () => {
		await mount(engineOf())

		const [name, city, age] = headers()
		const table = find('.s-table')

		await expect.poll(() => name.dataset.sized).toBe('true')

		expect(Math.abs(width(age) - 120)).toBeLessThanOrEqual(EPSILON)
		// Таблица во всю ширину места, и колонки без ширины делят остаток поровну
		expect(Math.abs(width(table) - 600)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(name) - width(city))).toBeLessThanOrEqual(EPSILON)
	})

	it('в тесном месте колонки без ширины — в ширине по умолчанию: таблица шире места, окно её прокручивает', async () => {
		await mount(engineOf(), 200)

		const [name, city] = headers()
		const table = find('.s-table')

		await expect.poll(() => width(name)).toBe(160)

		expect(width(city)).toBe(160)
		expect(width(table)).toBeGreaterThan(200)
		expect(Math.abs(width(viewport()) - 200)).toBeLessThanOrEqual(EPSILON)
		expect(style(viewport()).overflowX).toBe('auto')
		expect(viewport().scrollWidth).toBeGreaterThan(viewport().clientWidth)
	})

	it('до замера ширины решает тема: колонка без ширины не уже распорки в заголовке', async () => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'width: 200px' }, [
						h(Table, { engine: engineOf(), aria_label: 'Сотрудники' }),
					]),
			}),
		)

		// Тот же кадр, что и монтирование: плагин раскладки ещё не мерил окно
		const [name] = headers()
		const strut = parseFloat(style(name).fontSize) * 10

		expect(name.dataset.sized).toBe('false')
		expect(width(name)).toBeGreaterThanOrEqual(strut)
		expect(find('.s-table').hasAttribute('data-overflow')).toBe(false)
	})
})

/**
 * `columnFit` — как колонки без своей ширины делят место окна: `none` — стоят
 * в ширине по умолчанию, `auto` — растут до `maxWidth` во всю ширину окна,
 * `contain` — ровно заполняют окно, сжимаясь до `minWidth`. Не влезли — окно
 * прокручивает таблицу вбок (`data-overflow`), кроме закреплённой шапки: с
 * ней прокручивает контейнер.
 */
describe('раскладка колонок', () => {
	const NAME_FLEX: TTableColumnSource = {
		field: 'name',
		text: 'Имя',
		rowHeader: true,
		minWidth: 120,
	}
	const CITY_FLEX: TTableColumnSource = { field: 'city', text: 'Город', minWidth: 100 }

	/** Таблица в месте, ширину которого тест меняет на лету, с пропсами таблицы. */
	async function mountIn(
		engine: TTableCollection,
		place: Ref<number>,
		props: Record<string, unknown> = {},
	): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h('div', { style: `width: ${place.value}px` }, [
						h(Table, { engine, aria_label: 'Сотрудники', ...props }),
					]),
			}),
		)

		await new Promise((resolve) => requestAnimationFrame(resolve))
	}

	it('none — таблица шириной в сумму ширин по умолчанию, хоть место и шире', async () => {
		await mountIn(resizeEngine([NAME_FLEX, CITY_FLEX]), ref(400), { columnFit: 'none' })

		const table = find('.s-table')

		await expect.poll(() => width(table)).toBe(320)

		expect(headers().map(width)).toEqual([160, 160])
		await expect.poll(() => table.dataset.overflow).toBe('false')
		expect(style(viewport()).overflowX).toBe('clip')
	})

	it('auto — гибкие растут до maxWidth: упёрлись все — таблица уже окна', async () => {
		const engine = resizeEngine([
			{ ...NAME_FLEX, maxWidth: 150 },
			{ ...CITY_FLEX, maxWidth: 180 },
		])

		await mountIn(engine, ref(400))

		const table = find('.s-table')

		await expect.poll(() => width(table)).toBe(330)

		expect(headers().map(width)).toEqual([150, 180])
	})

	it('contain — таблица шириной в окно; окно сузилось — колонки сжимаются до minWidth, дальше окно прокручивает', async () => {
		const place = ref(400)

		await mountIn(resizeEngine([NAME_FLEX, CITY_FLEX]), place, { columnFit: 'contain' })

		const table = find('.s-table')

		await expect.poll(() => headers().map(width)).toEqual([200, 200])
		expect(Math.abs(width(table) - 400)).toBeLessThanOrEqual(EPSILON)
		expect(viewport().scrollWidth).toBe(viewport().clientWidth)

		place.value = 250

		// Ниже ширины по умолчанию: `contain` сжимает, а `auto` стоял бы в 160
		await expect.poll(() => headers().map(width)).toEqual([125, 125])
		expect(Math.abs(width(table) - 250)).toBeLessThanOrEqual(EPSILON)

		place.value = 200

		await expect.poll(() => headers().map(width)).toEqual([120, 100])
		await expect.poll(() => table.dataset.overflow).toBe('true')
		expect(style(viewport()).overflowX).toBe('auto')
		expect(viewport().scrollWidth).toBeGreaterThan(viewport().clientWidth)
	})

	it('колонка выбора — не место колонок: auto заполняет окно вместе с ней', async () => {
		const engine = engineOf([NAME_FLEX, CITY_FLEX])

		await mountIn(engine, ref(400))

		const table = find('.s-table')
		const select = find('.s-table__select')
		const columns = () => headers().reduce((sum, header) => sum + width(header), 0)

		await expect.poll(() => headers()[0].dataset.sized).toBe('true')

		// Колонки заняли окно без колонки выбора: с ней таблица ровно в окно
		expect(Math.abs(width(select) + columns() - 400)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(table) - 400)).toBeLessThanOrEqual(EPSILON)
		expect(table.dataset.overflow).toBe('false')
	})

	/**
	 * Колонку, которую тянут за край окна, таблица не обрезает: колонки стали
	 * шире места — окно прокручивает таблицу вбок, а контейнер вокруг не
	 * растёт.
	 */
	it('протяжка последней колонки за край — окно прокручивается', async () => {
		const engine = resizeEngine([
			{ ...NAME_FLEX, width: 100 },
			{ ...CITY_FLEX, width: 100, resizable: true },
		])

		render(
			defineComponent({
				render: () =>
					h('div', { class: 's-test-scroll', style: 'width: 300px; overflow: auto' }, [
						h(Table, { engine, aria_label: 'Сотрудники' }),
					]),
			}),
		)
		await new Promise((resolve) => requestAnimationFrame(resolve))

		const [, city] = headers()

		await expect.poll(() => city.querySelector('.s-table-column__resizer')).not.toBeNull()
		await drag(city, 140)

		const scroller = find('.s-test-scroll')

		await expect.poll(() => find('.s-table').dataset.overflow).toBe('true')
		expect(width(city)).toBe(240)
		expect(style(viewport()).overflowX).toBe('auto')
		expect(viewport().scrollWidth).toBeGreaterThan(viewport().clientWidth)
		// Прокручивает окно, а не контейнер вокруг
		expect(scroller.scrollWidth).toBe(scroller.clientWidth)
	})

	it('с закреплённой шапкой окно не прокручивается: вбок прокручивает контейнер', async () => {
		const engine = resizeEngine([
			{ ...NAME_FLEX, width: 200 },
			{ ...CITY_FLEX, width: 200 },
		])

		render(
			defineComponent({
				render: () =>
					h('div', { class: 's-test-scroll', style: 'width: 300px; overflow: auto' }, [
						h(Table, { engine, stickyHead: true, aria_label: 'Сотрудники' }),
					]),
			}),
		)
		await new Promise((resolve) => requestAnimationFrame(resolve))

		const scroller = find('.s-test-scroll')

		await expect.poll(() => find('.s-table').dataset.overflow).toBe('true')
		expect(style(viewport()).overflowX).toBe('visible')
		expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth)
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

/**
 * Заголовок, с которым что-то делают, читается ячейкой: под указателем он
 * подсвечен прямоугольником от линии до линии, и видно, где колонка
 * кончается, — а у её границы ручка ширины. Верхние углы заголовка мягче —
 * вполовину скругления кнопки, нижние прямые. Кнопка сортировки — во всю
 * ячейку, с углами заголовка, а стрелка стоит сразу за подписью, как в
 * ClickUp, а не у другого края кнопки.
 */
describe('заголовок колонки — ячейкой', () => {
	/** Сколько от подписи до стрелки при любом выравнивании: зазор флекса кнопки, не больше. */
	const GAP = 8

	/** Подпись и стрелка кнопки сортировки в заголовке. */
	function sortParts(header: Element) {
		const button = find('.s-table-column__sort', header)

		return {
			button,
			text: textBox(find('.s-button__text', button)),
			icon: find('.s-table-column__sort-icon', button).getBoundingClientRect(),
		}
	}

	/** Фон заголовка без указателя на нём — и с указателем посередине. */
	async function hoverBackground(header: Element): Promise<{ idle: string; hover: string }> {
		await userEvent.hover(find('.s-test-away'))
		await settled(header)

		const idle = style(header).backgroundColor
		const box = header.getBoundingClientRect()

		await userEvent.hover(header, { position: { x: box.width / 2, y: box.height / 2 } })
		await settled(header)

		return { idle, hover: style(header).backgroundColor }
	}

	/** Таблица с полосой «мимо» над ней: туда уводят указатель. */
	async function mountAway(engine: TTableCollection, disabled = false): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'width: 600px' }, [
						h('div', { class: 's-test-away', style: 'height: 24px' }),
						h(Table, { engine, disabled, aria_label: 'Сотрудники' }),
					]),
			}),
		)

		await new Promise((resolve) => requestAnimationFrame(resolve))
	}

	it('кнопка сортировки — во всю ячейку заголовка', async () => {
		await mount(engineOf())

		for (const index of [0, 2]) {
			const header = headers()[index]
			const box = header.getBoundingClientRect()
			const { button } = sortParts(header)
			const own = button.getBoundingClientRect()

			expect(Math.abs(own.left - box.left)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(own.right - box.right)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(own.top - box.top)).toBeLessThanOrEqual(EPSILON)
			expect(Math.abs(own.bottom - box.bottom)).toBeLessThanOrEqual(EPSILON)
		}
	})

	it('верхние углы заголовка и кнопки — вполовину скругления кнопки, нижние прямые', async () => {
		render(
			defineComponent({
				render: () =>
					h('div', { style: 'width: 600px' }, [
						h(Table, { engine: engineOf(), aria_label: 'Сотрудники' }),
						h(Button, { class: 's-test-button', text: 'Кнопка' }),
					]),
			}),
		)
		await new Promise((resolve) => requestAnimationFrame(resolve))

		const header = headers()[0]
		const { button } = sortParts(header)
		const half = parseFloat(style(find('.s-test-button')).borderTopLeftRadius) / 2

		expect(half).toBeGreaterThan(0)

		for (const corner of [header, button]) {
			expect(parseFloat(style(corner).borderTopLeftRadius)).toBe(half)
			expect(parseFloat(style(corner).borderTopRightRadius)).toBe(half)
			expect(style(corner).borderBottomLeftRadius).toBe('0px')
			expect(style(corner).borderBottomRightRadius).toBe('0px')
		}
	})

	/**
	 * Отметка стоит и у неотсортированной колонки — невидимой, держа место, —
	 * поэтому её место видно без сортировки.
	 */
	it('стрелка — сразу за подписью, у колонки по концу — перед ней', async () => {
		await mount(engineOf())

		const start = sortParts(headers()[0])

		expect(start.icon.left).toBeGreaterThanOrEqual(start.text.right - EPSILON)
		expect(start.icon.left - start.text.right).toBeLessThanOrEqual(GAP)

		const end = sortParts(headers()[2])

		expect(end.icon.right).toBeLessThanOrEqual(end.text.left + EPSILON)
		expect(end.text.left - end.icon.right).toBeLessThanOrEqual(GAP)
	})

	it('кольцо фокуса кнопки — внутри ячейки', async () => {
		await mount(engineOf())

		const { button } = sortParts(headers()[0])

		button.focus({ focusVisible: true })

		expect(parseFloat(style(button).outlineOffset)).toBeLessThan(0)
	})

	it('сортируемый заголовок под указателем подсвечен; заголовок без действий — нет', async () => {
		await mountAway(engineOf())

		const [name, city] = headers()
		const sortable = await hoverBackground(name)

		expect(opacity(sortable.idle)).toBe(0)
		expect(opacity(sortable.hover)).toBeGreaterThan(0)

		const plain = await hoverBackground(city)

		expect(opacity(plain.hover)).toBe(0)
	})

	it('заголовок с одной ручкой ширины подсвечен так же, как сортируемый', async () => {
		const columns = [NAME, CITY].map((column) => ({ ...column, resizable: true, width: 160 }))

		await mountAway(engineOf(columns))

		const [name, city] = headers()
		const sortable = await hoverBackground(name)
		const resizable = await hoverBackground(city)

		expect(opacity(resizable.hover)).toBeGreaterThan(0)
		expect(pixel([resizable.hover])).toEqual(pixel([sortable.hover]))
	})

	it('заголовок, который можно только перетащить, подсвечен так же', async () => {
		await mountAway(engineOf([NAME, { ...CITY, reorderable: true }]))

		const [name, city] = headers()
		const sortable = await hoverBackground(name)
		const reorderable = await hoverBackground(city)

		expect(opacity(reorderable.hover)).toBeGreaterThan(0)
		expect(pixel([reorderable.hover])).toEqual(pixel([sortable.hover]))
	})

	it('у выключенной таблицы подсветки нет', async () => {
		await mountAway(engineOf(), true)

		const { hover } = await hoverBackground(headers()[0])

		expect(opacity(hover)).toBe(0)
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

/**
 * Перестановка колонок — заголовком: пока его тащат, за указателем идёт он
 * один, а колонка встаёт на новое место одной перестановкой, когда
 * отпущенный заголовок доехал до места. С движением соседи уступают ему
 * место, и линии места нет; тело у `head` стоит, у `column` идёт за
 * заголовками. Без движения соседи стоят, а место показывает линия. Нажатие
 * без протяжки остаётся нажатием кнопки сортировки, а протяжка её не нажимает.
 * Клавиши — Ctrl+Shift+←/→ на кнопке, и фокус с неё не уходит.
 *
 * Прогон идёт с движением: система его не убирает, режим приложения —
 * системы. Колонка встаёт не на отпускании, а когда заголовок доехал, —
 * порядок после отпускания тест ждёт опросом.
 */
describe('перестановка колонок', () => {
	const MOVABLE = [NAME, CITY, AGE].map((column) => ({ ...column, reorderable: true }))

	/**
	 * Место не шире окна прогона (414 px): протяжка за край окна прокрутила бы
	 * страницу, и коробки до и после протяжки разошлись бы на прокрутку.
	 */
	const PLACE = 400

	/** Движок без колонки выбора: заголовки шапки — только колонки данных. */
	function moveEngine(): TTableCollection {
		const engine = engineOf(MOVABLE)

		engine.extensions.selection.mode = 'none'

		return engine
	}

	/** Таблица с пропсами в месте `PLACE`. */
	async function mountWith(
		engine: TTableCollection,
		props: Record<string, unknown>,
	): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h('div', { style: `width: ${PLACE}px` }, [
						h(Table, { engine, aria_label: 'Сотрудники', ...props }),
					]),
			}),
		)

		await new Promise((resolve) => requestAnimationFrame(resolve))
	}

	const fieldsOf = (engine: TTableCollection) =>
		engine.extensions.columns.columns.map((column) => column.field)

	/** Середина узла. */
	function middleOf(element: Element): { x: number; y: number } {
		const box = element.getBoundingClientRect()

		return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
	}

	/** Левый край узла. */
	const left = (element: Element) => element.getBoundingClientRect().left

	/** Края узлов совпали — с допуском на субпиксели. */
	const near = (actual: readonly number[], expected: readonly number[]): boolean =>
		actual.length === expected.length &&
		actual.every((value, index) => Math.abs(value - expected[index]) <= EPSILON)

	/** Ячейки строк — все, по строкам. */
	const cells = (): HTMLElement[] => [
		...document.querySelectorAll<HTMLElement>('.s-table-row__cell'),
	]

	/** Сдвиги, которые идут переходом, — у заголовков и ячеек. */
	const moving = (): string[] =>
		[...headers(), ...cells()].flatMap((element) =>
			transitioning(element).filter((property) => property === 'translate'),
		)

	/**
	 * Колонки разложены: место плагин раскладки мерит кадром позже
	 * монтирования, и до этого ширины колонок, а с ними и края заголовков, ещё
	 * не те.
	 */
	async function laidOut(): Promise<void> {
		await expect
			.poll(() => headers().every((header) => header.dataset.sized === 'true'))
			.toBe(true)
	}

	/**
	 * Взять заголовок за середину и нести указатель к точке `x` строки:
	 * сначала за порог жеста в её сторону, потом туда. Кнопка остаётся зажатой
	 * — отпускает тест. В сторону точки, а не всегда вправо: у последней
	 * колонки шаг вправо выходил бы за край окна прогона.
	 */
	async function carry(header: Element, x: number): Promise<void> {
		const from = middleOf(header)

		await pointAt(from.x, from.y)
		await commands.mouseDown()
		await pointAt(from.x + Math.sign(x - from.x) * 40, from.y)
		await pointAt(x, from.y)
	}

	it('тащат заголовок — сосед уступает место, строки на месте; отпустили — колонка на новом месте', async () => {
		const engine = moveEngine()
		const moves: string[][] = []

		engine.extensions.columns.events.on('column:move', ({ order }) => moves.push(order))
		await mount(engine, PLACE)
		await laidOut()

		const [name, city, age] = headers()
		const cell = rows()[0].children[0]
		const cityCell = rows()[0].children[1]
		const before = {
			name: name.getBoundingClientRect(),
			city: left(city),
			age: left(age),
			cells: [left(cell), left(cityCell)],
		}
		const runs = transitionRuns(city)

		try {
			await carry(name, middleOf(city).x + 10)

			// Заголовок идёт за указателем
			expect(name.dataset.dragging).toBe('true')
			expect(left(name) - before.name.left).toBeGreaterThan(100)
			// Сосед уступает место на ширину взятого — переходом; линии места нет
			expect(city.dataset.shift).toBe('start')
			await expect
				.poll(() => near([left(city)], [before.city - before.name.width]))
				.toBe(true)
			expect(runs).toContain('translate')
			expect(city.dataset.drop).toBe('after')
			expect(style(city, '::before').display).toBe('none')
			// Дальний сосед и ячейки строк — на месте
			expect(near([left(age)], [before.age])).toBe(true)
			expect(near([left(cell), left(cityCell)], before.cells)).toBe(true)
			expect(fieldsOf(engine)).toEqual(['name', 'city', 'age'])
		} finally {
			await commands.mouseUp()
		}

		await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		expect(moves).toEqual([['city', 'name', 'age']])

		await expect
			.poll(() => headers().map((header) => header.textContent?.trim()))
			.toEqual(['Город', 'Имя', 'Возраст'])

		// Ячейки строк — в новом порядке, метки и сдвиги сняты
		expect(rows()[0].children[1].textContent?.trim()).toBe('Анна Смирнова')
		expect(headers()[1].dataset.dragging).toBeUndefined()
		expect(headers()[1].dataset.landing).toBeUndefined()
		expect(headers()[0].dataset.shift).toBeUndefined()
		expect(headers()[1].style.getPropertyValue('--s-table-column-drag')).toBe('')
		expect(find('.s-table').style.getPropertyValue('--s-table-column-shift')).toBe('')
	})

	/**
	 * Колонка переставляется, когда отпущенный заголовок встал: к этому
	 * времени он и сдвинутые соседи стоят там, где их поставит новая
	 * раскладка, а переходы уходят вместе с жестом, — ничего не отъезжает.
	 * Коробки заголовков снимаются в `column:move` — перестановка уже в
	 * модели, а Vue ещё не перерисовал, — а заголовков и ячеек первой строки
	 * — следом за перерисовкой и ещё раз, когда переход сдвига, начнись он, уже
	 * доиграл бы. С `column:move` корень таблицы слушает и `transitionrun`
	 * сдвига: событие всплывает до него от заголовков и ячеек.
	 *
	 * Направлений три, и первое — взятая на место соседа — одно слепо. Vue
	 * переносит в документе узлы вне наибольшей возрастающей
	 * последовательности ключей: здесь это сдвинутый сосед, а взятый заголовок
	 * остаётся на месте. Последнюю колонку в начало и первую через две в конец
	 * Vue переносит взятой, а сдвинутые соседи с их ячейками остаются в
	 * документе на своих местах. Со взятым заголовком уезжает и кнопка
	 * сортировки, которую нажатие сфокусировало, и Chromium, теряя фокус,
	 * пересчитывает стиль посреди перерисовки: меток на заголовках к этому
	 * пересчёту уже нет, а признак корня ещё есть. Переход, который держался
	 * на признаке корня, а не на взятом заголовке, вёл в этом пересчёте ячейки
	 * соседей от сдвига к нулю (`themes/oren/src/components/table/_table.scss`,
	 * колонка целиком). В первом направлении взятый не переносится, пересчёта
	 * посреди перерисовки нет, и перестановка встаёт одним пересчётом.
	 */
	describe('отпустили — заголовок встал на место, потом перестановка; ничего не отъезжает', () => {
		/** Метки жеста у заголовка: после перестановки их нет ни у кого. */
		const MARKS = ['dragging', 'landing', 'drop', 'shift', 'still']

		/** Дольше перехода сдвига темы (`$reorder-duration`, 200 мс): начнись он — доиграл бы. */
		const SETTLE = 300

		/** Текст заголовка колонки по полю. */
		const textOf = (field: string) => MOVABLE.find((column) => column.field === field)?.text

		it.each(
			(['head', 'column'] as const).flatMap((preview) => [
				{ preview, name: 'взятая — на место соседа', take: 0, past: 1 },
				{ preview, name: 'последняя — в начало', take: 2, past: 0 },
				{ preview, name: 'первая — через две в конец', take: 0, past: 2 },
			]),
		)('$preview: $name', async ({ preview, take, past }) => {
			const engine = moveEngine()

			await mountWith(engine, { reorderPreview: preview })
			await laidOut()

			const root = find('.s-table')
			const nodes = headers()
			const before = nodes.map(left)
			const widths = nodes.map(width)
			const order = fieldsOf(engine)
			const forward = past > take

			order.splice(past, 0, ...order.splice(take, 1))

			// Соседи от взятой до места уступают ей место — на её ширину
			const shifted = nodes.filter(
				(_, index) =>
					index !== take &&
					index >= Math.min(take, past) &&
					index <= Math.max(take, past),
			)
			const shiftedTo = shifted.map(
				(node) => left(node) + (forward ? -widths[take] : widths[take]),
			)
			const runs: string[] = []
			const seen: {
				at: number[]
				heads: number[]
				cells: Element[]
				boxes: number[]
				moving: string[]
			}[] = []

			engine.extensions.columns.events.on('column:move', () => {
				const at = nodes.map(left)

				root.addEventListener('transitionrun', (event) => {
					const { target } = event

					if (event.propertyName !== 'translate' || !(target instanceof Element)) return
					if (!target.matches('.s-table-column, .s-table-row__cell')) return

					runs.push(`${target.className} «${target.textContent?.trim()}»`)
				})

				void nextTick(() => {
					const cells = [...rows()[0].children]

					seen.push({
						at,
						heads: nodes.map(left),
						cells,
						boxes: cells.map(left),
						moving: moving(),
					})
				})
			})

			try {
				await carry(nodes[take], middleOf(nodes[past]).x + (forward ? 10 : -10))
				await expect.poll(() => near(shifted.map(left), shiftedTo)).toBe(true)
			} finally {
				await commands.mouseUp()
			}

			await expect.poll(() => seen.length).toBe(1)
			await new Promise((resolve) => setTimeout(resolve, SETTLE))

			const [{ at, heads, cells, boxes }] = seen
			const placed = headers()
			let edge = before[0]
			// Новая раскладка — заголовки подряд в новом порядке, ширины прежние
			const laid = placed.map((header) => {
				const start = edge

				edge += widths[nodes.indexOf(header)]

				return start
			})

			expect(fieldsOf(engine)).toEqual(order)
			expect(placed.map((header) => header.textContent?.trim())).toEqual(order.map(textOf))
			expect(near(placed.map(left), laid), 'заголовки — в новой раскладке').toBe(true)
			// Заголовки доехали до места раньше перестановки, и она их не сдвинула
			expect(near(heads, at), `в перерисовку: ${heads} — ${at}`).toBe(true)
			// После перерисовки никто не поехал
			expect(seen[0].moving, 'переходы сдвига после перерисовки').toEqual([])
			expect(runs, 'начатые переходы сдвига').toEqual([])
			expect(near(nodes.map(left), heads), 'заголовки стоят').toBe(true)
			expect(near(cells.map(left), boxes), 'ячейки стоят').toBe(true)
			// Жеста нет
			expect(root.hasAttribute('data-reorder-preview')).toBe(false)
			expect(
				placed.flatMap((header) => MARKS.filter((mark) => mark in header.dataset)),
			).toEqual([])
		})
	})

	/**
	 * Шапка стоит (`none`): и с движением соседи без сдвига и перехода, место
	 * — линия, а колонка встаёт на отпускании, без приземления.
	 */
	it('none: соседи стоят, линия видна, колонка встаёт на отпускании', async () => {
		const engine = moveEngine()

		await mountWith(engine, { reorderPreview: 'none' })
		await laidOut()

		const [name, city, age] = headers()
		const before = [city, age].map(left)
		const runs = transitionRuns(city)

		try {
			await carry(name, middleOf(city).x + 10)

			expect(name.dataset.still).toBe('true')
			expect(city.dataset.drop).toBe('after')
			expect(city.dataset.shift).toBeUndefined()
			expect(style(city, '::before').display).not.toBe('none')
			expect(near([left(city), left(age)], before)).toBe(true)
			expect(style(city).translate).toBe('none')
			expect(runs).not.toContain('translate')
			expect(find('.s-table').style.getPropertyValue('--s-table-column-shift')).toBe('')
		} finally {
			await commands.mouseUp()
		}

		// Без приземления — сразу после отпускания, `plugins/__tests__` проверяет
		// это без кадров; здесь — что колонка встала и метки сняты
		await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		await expect
			.poll(() => headers().map((header) => header.textContent?.trim()))
			.toEqual(['Город', 'Имя', 'Возраст'])
		expect(headers()[1].dataset.still).toBeUndefined()
	})

	it('column: ячейки соседа идут с его заголовком, ячейки взятой спрятаны', async () => {
		const engine = moveEngine()

		await mountWith(engine, { reorderPreview: 'column' })
		await laidOut()

		const [name, city] = headers()
		const [nameCell, cityCell, ageCell] = rows()[0].children
		const before = [nameCell, cityCell, ageCell].map(left)
		const width = name.getBoundingClientRect().width

		try {
			await carry(name, middleOf(city).x + 10)

			await expect.poll(() => near([left(cityCell)], [before[1] - width])).toBe(true)
			expect(near([left(ageCell)], [before[2]])).toBe(true)
			// Ячейки взятой — спрятаны во всех строках, на месте
			expect(rows().map((row) => style(row.children[0]).visibility)).toEqual(
				rows().map(() => 'hidden'),
			)
			expect(near([left(nameCell)], [before[0]])).toBe(true)
			expect(rows().map((row) => style(row.children[1]).visibility)).toEqual(
				rows().map(() => 'visible'),
			)
		} finally {
			await commands.mouseUp()
		}

		await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		await expect
			.poll(() => rows().map((row) => style(row.children[1]).visibility))
			.toEqual(rows().map(() => 'visible'))
	})

	/**
	 * Правила тела темы стоят под признаком корня `data-reorder-preview`, и
	 * есть он только в жесте: на покое таблица в `column` ячейкам ничего не
	 * стоит — у них нет ни перехода, ни сдвига, как в `head`.
	 */
	it('column на покое: у корня нет признака, у ячеек — ни перехода, ни сдвига', async () => {
		const engine = moveEngine()

		await mountWith(engine, { reorderPreview: 'column' })
		await laidOut()

		const root = find('.s-table')
		// Ни сдвига, ни объявленного перехода сдвига, ни идущего перехода
		const still = () =>
			moving().length === 0 &&
			cells().every((cell) => {
				const { translate, transitionProperty } = style(cell)
				const declared = transitionProperty.split(',').map((each) => each.trim())

				return translate === 'none' && !declared.includes('translate')
			})
		const [name, city] = headers()

		expect(root.hasAttribute('data-reorder-preview')).toBe(false)
		expect(still()).toBe(true)

		try {
			await carry(name, middleOf(city).x + 10)

			expect(root.dataset.reorderPreview).toBe('column')
		} finally {
			await commands.mouseUp()
		}

		await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		await expect.poll(() => root.hasAttribute('data-reorder-preview')).toBe(false)
		expect(still()).toBe(true)
	})

	it('RTL: сосед уступает место к началу строки — вправо', async () => {
		const engine = moveEngine()

		await mount(engine, PLACE, 'rtl')
		await laidOut()

		const [name, city] = headers()
		const before = left(city)
		const width = name.getBoundingClientRect().width

		try {
			// Первая колонка справа; к концу строки — влево, за середину соседа
			await carry(name, middleOf(city).x - 10)

			expect(city.dataset.shift).toBe('start')
			await expect.poll(() => near([left(city)], [before + width])).toBe(true)
		} finally {
			await commands.mouseUp()
		}

		await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
	})

	it('Escape — соседи возвращаются, заголовок едет на своё место, колонка стоит', async () => {
		const engine = moveEngine()

		await mount(engine, PLACE)
		await laidOut()

		const [name, city, age] = headers()
		const before = [name, city, age].map(left)

		try {
			await carry(name, middleOf(age).x + 10)
			await expect.poll(() => age.dataset.shift).toBe('start')

			await userEvent.keyboard('{Escape}')

			expect(city.dataset.shift).toBeUndefined()
			await expect.poll(() => name.dataset.dragging).toBeUndefined()
			expect(near([name, city, age].map(left), before)).toBe(true)
		} finally {
			await commands.mouseUp()
		}

		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(fieldsOf(engine)).toEqual(['name', 'city', 'age'])
	})

	it('без движения соседи стоят, место — линия; колонка встаёт после отпускания', async () => {
		useMotion('reduce')

		try {
			const engine = moveEngine()

			await mount(engine, PLACE)
			await laidOut()

			const [name, city] = headers()
			const before = left(city)

			try {
				await carry(name, middleOf(city).x + 10)

				expect(city.dataset.shift).toBe('start')
				// Переход шёл бы двести миллисекунд — пара кадров его бы застала
				await new Promise((resolve) => requestAnimationFrame(resolve))
				await new Promise((resolve) => requestAnimationFrame(resolve))

				expect(near([left(city)], [before])).toBe(true)
				expect(city.dataset.drop).toBe('after')
				expect(style(city, '::before').display).not.toBe('none')
				expect(parseFloat(style(city, '::before').width)).toBe(3)
			} finally {
				await commands.mouseUp()
			}

			await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		} finally {
			useMotion('system')
		}
	})

	/**
	 * Линия места нарисована у каждого невзятого заголовка весь жест,
	 * прозрачной, а метка места только красит её и ставит к краю: линия,
	 * которая появлялась и пропадала вместе с меткой, перекладывала всю
	 * таблицу на каждую смену места (`BENCHMARKS.md`). С движением соседи
	 * расступаются, и линии нет вовсе — ни у одного заголовка.
	 */
	describe('линия места', () => {
		/** Линии невзятых заголовков — вычисленный стиль их `::before`. */
		const lines = (): CSSStyleDeclaration[] =>
			headers()
				.filter((header) => header.dataset.dragging !== 'true')
				.map((header) => style(header, '::before'))

		/** Линия нарисована: псевдоэлемент есть в раскладке. */
		const drawn = (line: CSSStyleDeclaration): boolean =>
			line.content !== 'none' && line.display !== 'none'

		/** Линия видна: у неё цвет. */
		const shown = (header: Element): boolean =>
			opacity(style(header, '::before').backgroundColor) > 0

		it.each([
			{ name: 'без движения', props: {}, motion: 'reduce' },
			{ name: 'none', props: { reorderPreview: 'none' }, motion: 'system' },
		] as const)(
			'$name: у каждого невзятого заголовка весь жест, метка только красит её',
			async ({ props, motion }) => {
				useMotion(motion)

				try {
					const engine = moveEngine()

					await mountWith(engine, props)
					await laidOut()

					const [name, city, age] = headers()

					try {
						await carry(name, middleOf(city).x + 10)

						expect(city.dataset.drop).toBe('after')
						expect(lines().every(drawn)).toBe(true)
						expect([shown(city), shown(age)]).toEqual([true, false])

						// Место уходит дальше: линия соседа остаётся в раскладке и гаснет
						await pointAt(middleOf(age).x + 10, middleOf(age).y)
						await expect.poll(() => age.dataset.drop).toBe('after')

						expect(lines().every(drawn)).toBe(true)
						expect([shown(city), shown(age)]).toEqual([false, true])
					} finally {
						await commands.mouseUp()
					}

					await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'age', 'name'])
					expect(lines().some(drawn)).toBe(false)
				} finally {
					useMotion('system')
				}
			},
		)

		it('с движением соседи расступаются — линии нет ни у одного заголовка', async () => {
			const engine = moveEngine()

			await mount(engine, PLACE)
			await laidOut()

			const [name, city] = headers()

			try {
				await carry(name, middleOf(city).x + 10)

				expect(city.dataset.drop).toBe('after')
				expect(lines().some(drawn)).toBe(false)
			} finally {
				await commands.mouseUp()
			}

			await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		})
	})

	/**
	 * Шапка поднята над телом и рисуется после него, и без закрепления. Поле
	 * чекбокса строки поднято (`z-10`), и без подъёма шапки браузер рисовал бы
	 * его после заголовков: заголовок, ставший в жесте своим слоем, сверялся бы
	 * с полем каждой строки на каждой перестройке слоёв — на 5000 строк
	 * ~350 мс на взятии и на каждой смене места (`BENCHMARKS.md`).
	 */
	it('шапка поднята над полем чекбокса строки', async () => {
		await mount(engineOf(), PLACE)

		const head = find('.s-table__head')
		const field = find('.s-table-row__select input')

		expect(style(head).position).not.toBe('static')
		expect(Number(style(head).zIndex)).toBeGreaterThan(Number(style(field).zIndex))
	})

	it('протяжка кнопку сортировки не нажимает, нажатие без протяжки — сортирует', async () => {
		const engine = moveEngine()

		await mount(engine, PLACE)

		const [name, city] = headers()
		const from = middleOf(name)

		await pointAt(from.x, from.y)
		await commands.mouseDown()

		try {
			await pointAt(from.x + 30, from.y)
			await pointAt(middleOf(city).x + 20, from.y)
		} finally {
			await commands.mouseUp()
		}

		await expect.poll(() => fieldsOf(engine)).toEqual(['city', 'name', 'age'])

		// Нажатие на колонку после протяжки не досталось
		await new Promise((resolve) => requestAnimationFrame(resolve))
		expect(headers().some((header) => header.dataset.sort)).toBe(false)

		const sortable = headers()[1]

		await userEvent.click(find('.s-table-column__sort', sortable))

		await expect.poll(() => sortable.dataset.sort).toBe('asc')
		expect(fieldsOf(engine)).toEqual(['city', 'name', 'age'])
	})

	it('Ctrl+Shift+→ на кнопке — колонка на шаг дальше, фокус остаётся на кнопке', async () => {
		const engine = moveEngine()

		await mount(engine, PLACE)

		const button = find('.s-table-column__sort', headers()[0])

		button.focus()
		await userEvent.keyboard('{Control>}{Shift>}{ArrowRight}{/Shift}{/Control}')

		expect(fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		await expect.poll(() => headers()[1].contains(document.activeElement)).toBe(true)
		expect(document.activeElement).toBe(button)
	})

	it('RTL: Ctrl+Shift+← — к концу строки', async () => {
		const engine = moveEngine()

		await mount(engine, PLACE, 'rtl')

		find('.s-table-column__sort', headers()[0]).focus()
		await userEvent.keyboard('{Control>}{Shift>}{ArrowLeft}{/Shift}{/Control}')

		expect(fieldsOf(engine)).toEqual(['city', 'name', 'age'])
	})
})

/**
 * Сетка (APG Data Grid) настоящими клавишами: Tab входит в таблицу на ячейку
 * под фокусом сетки и выходит из неё за таблицу, минуя поля и кнопки ячеек;
 * стрелки ведут фокус по ячейкам; строка под фокусом и под указателем
 * подсвечена, ячейка под фокусом с клавиатуры — в кольце внутри своих границ.
 */
describe('сетка', () => {
	/** Сетка с выбором строк между двумя кнопками: Tab входит и выходит. */
	async function mountGrid(): Promise<TTableCollection> {
		const engine = engineOf()

		engine.extensions.grid.grid = true

		render(
			defineComponent({
				render: () =>
					h('div', { style: 'width: 400px' }, [
						h('button', { class: 's-test-before' }, 'до'),
						h(Table, { engine, aria_label: 'Сотрудники' }),
						h('button', { class: 's-test-after' }, 'после'),
					]),
			}),
		)

		await new Promise((resolve) => requestAnimationFrame(resolve))

		return engine
	}

	it('Tab — на ячейку, стрелки — по ячейкам, Tab — за таблицу мимо полей ячеек', async () => {
		await mountGrid()

		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}')

		// Выбор включили после колонок — фокус сетки на первой из них
		expect(document.activeElement).toBe(headers()[0])

		await userEvent.keyboard('{ArrowDown}{ArrowRight}')

		expect(document.activeElement).toBe(rows()[0].children[2])

		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(find('.s-test-after'))

		// Shift+Tab — обратно на ту же ячейку: у сетки одна остановка
		await userEvent.keyboard('{Shift>}{Tab}{/Shift}')

		expect(document.activeElement).toBe(rows()[0].children[2])
	})

	it('ячейка под фокусом с клавиатуры — в кольце внутри своих границ', async () => {
		await mountGrid()

		find('.s-test-before').focus()
		await userEvent.keyboard('{Tab}{ArrowDown}')

		const cell = rows()[0].children[1]

		expect(document.activeElement).toBe(cell)
		expect(style(cell).outlineStyle).toBe('solid')
		expect(parseFloat(style(cell).outlineOffset)).toBeLessThan(0)
	})

	it('строка под фокусом и под указателем подсвечена; нажатие по строке — её выбор', async () => {
		const engine = await mountGrid()
		const [first, second] = rows()

		await userEvent.hover(find('.s-test-before'))
		await settled(document.body)

		expect(opacity(style(second).backgroundColor)).toBe(0)

		await userEvent.hover(second.children[2])
		await settled(second)

		expect(opacity(style(second).backgroundColor)).toBeGreaterThan(0)

		await userEvent.click(second.children[2])

		expect(engine.extensions.selection.selected).toEqual([engine.extensions.batch.items[1]])
		expect(second.getAttribute('aria-selected')).toBe('true')

		// Фокус встал на нажатую ячейку — её строка подсвечена и без указателя
		await userEvent.hover(find('.s-test-before'))
		await settled(document.body)

		expect(second.contains(document.activeElement)).toBe(true)
		expect(opacity(style(first).backgroundColor)).toBe(0)
		expect(style(second).backgroundColor).not.toBe(style(first).backgroundColor)
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

	it('колонка без своей ширины: ручка — с раскладкой, протяжка — от ширины, которую видно', async () => {
		await mount(resizeEngine([CITY_RESIZE, AGE_RESIZE]), PLACE)

		const [header] = headers()

		// До замера окна ширину решает тема, и ручка ждёт раскладки ядра —
		// кадром позже наблюдателя
		await expect.poll(() => header.querySelector('.s-table-column__resizer')).not.toBeNull()

		const before = width(header)

		await drag(header, -30)

		expect(Math.abs(width(header) - (before - 30))).toBeLessThanOrEqual(EPSILON)
		expect(header.dataset.sized).toBe('true')
	})

	/**
	 * Отложенная протяжка: таблица в жесте не перекладывается — ширины стоят до
	 * отпускания, а новую границу показывает призрак — линия на полосе ручки
	 * (`::after`), сдвинутая на ширину будущей правки.
	 */
	describe('отложенная протяжка (deferred)', () => {
		const DEFERRED = { resizePreview: 'deferred' }

		/** Нажать на полосу и сдвинуть указатель на `dx`, не отпуская. */
		async function hold(header: Element, dx: number): Promise<void> {
			const box = resizerOf(header).getBoundingClientRect()
			const x = box.left + box.width / 2
			const y = box.top + box.height / 2

			await pointAt(x, y)
			await commands.mouseDown()
			await pointAt(x + dx / 2, y)
			await pointAt(x + dx, y)
		}

		/** Призрак ручки: виден ли и на сколько сдвинут. */
		function ghostOf(header: Element): { shown: boolean; shift: string; height: number } {
			const style = getComputedStyle(resizerOf(header), '::after')

			return {
				shown: style.content !== 'none',
				shift: style.translate,
				height: parseFloat(style.blockSize),
			}
		}

		it('призрак идёт за указателем, ширины стоят; отпускание — ширина и один commit', async () => {
			const engine = resizeEngine(ALL)
			const commits: number[] = []

			columnOf(engine, 'name').events.on('commit', (value) => commits.push(value))
			await mount(engine, PLACE, 'ltr', DEFERRED)

			const [name, city, age] = headers()
			const before = [name, city, age].map(width)

			expect(ghostOf(name).shown).toBe(false)

			try {
				await hold(name, 40)

				await expect.poll(() => ghostOf(name).shift).toBe('40px')
				expect(ghostOf(name).shown).toBe(true)
				// От верха заголовка до низа таблицы
				const table = find('.s-table').getBoundingClientRect()

				expect(
					Math.abs(
						ghostOf(name).height - (table.bottom - name.getBoundingClientRect().top),
					),
				).toBeLessThanOrEqual(EPSILON)
				expect([name, city, age].map(width)).toEqual(before)
				expect(commits).toEqual([])
			} finally {
				await commands.mouseUp()
			}

			await expect.poll(() => width(name)).toBeCloseTo(before[0] + 40, 0)
			expect(commits).toEqual([160])
			expect(ghostOf(name).shown).toBe(false)
		})

		it('RTL: призрак уходит влево, когда колонка растёт', async () => {
			const engine = resizeEngine(ALL)

			await mount(engine, PLACE, 'rtl', DEFERRED)

			const [name] = headers()

			try {
				await hold(name, -40)

				await expect.poll(() => ghostOf(name).shift).toBe('-40px')
				expect(Math.abs(width(name) - 120)).toBeLessThanOrEqual(EPSILON)
			} finally {
				await commands.mouseUp()
			}

			expect(columnOf(engine, 'name').width).toBe(160)
		})

		it('призрак — в границах колонки, и записано то же', async () => {
			const engine = resizeEngine(ALL)

			await mount(engine, PLACE, 'ltr', DEFERRED)

			const [name] = headers()

			try {
				await hold(name, 240)

				// maxWidth 300 от ширины 120
				await expect.poll(() => ghostOf(name).shift).toBe('180px')
			} finally {
				await commands.mouseUp()
			}

			expect(columnOf(engine, 'name').width).toBe(300)
		})

		/**
		 * Сторож задачи. У последней колонки линия ручки стоит у края таблицы, а
		 * не посередине полосы, и правило призрака, равное по весу и стоящее
		 * ниже, перебивало это: призрак вставал на несколько px раньше линии.
		 */
		it.each([
			['средней', 0],
			['последней', 2],
		])('у %s колонки призрак на нажатии — ровно на линии ручки', async (_, index) => {
			const engine = resizeEngine(ALL)

			await mount(engine, PLACE, 'ltr', DEFERRED)

			const header = headers()[index]
			const resizer = resizerOf(header)
			const edgeOf = (pseudo: string) => {
				const style = getComputedStyle(resizer, pseudo)

				return { left: style.left, right: style.right }
			}

			try {
				await hold(header, 0)
				await expect.poll(() => ghostOf(header).shown).toBe(true)

				expect(ghostOf(header).shift).toBe('0px')
				expect(edgeOf('::after')).toEqual(edgeOf('::before'))
			} finally {
				await commands.mouseUp()
			}
		})

		it('Escape — призрак снят, ширина та же', async () => {
			const engine = resizeEngine(ALL)

			await mount(engine, PLACE, 'ltr', DEFERRED)

			const [name] = headers()

			try {
				await hold(name, 40)
				await expect.poll(() => ghostOf(name).shown).toBe(true)
				await userEvent.keyboard('{Escape}')
				await expect.poll(() => ghostOf(name).shown).toBe(false)
			} finally {
				await commands.mouseUp()
			}

			expect(columnOf(engine, 'name').width).toBe(120)
		})
	})

	/**
	 * Сторож задачи. Гибкие колонки перед тянутой перераскладывались вместе с
	 * остальными, и край шёл за указателем вполовину или стоял, а колонка росла
	 * в обратную сторону. Колонки перед тянутой держат ширину, место отдаёт
	 * колонка после неё.
	 */
	it('auto, гибкие колонки: край идёт за указателем, левый край стоит', async () => {
		const FLEX = { resizable: true }

		// Гибкие делят 400 − 60: по 170. Без правила первая сжалась бы к 160, и
		// край второй ушёл бы на 30, а не на 40
		await mount(
			resizeEngine([
				{ ...NAME, ...FLEX },
				{ ...CITY, ...FLEX },
				{ ...AGE, ...FLEX, width: 60 },
			]),
			PLACE,
		)

		const [first, second] = headers()

		await expect.poll(() => second.querySelector('.s-table-column__resizer')).not.toBeNull()

		const before = second.getBoundingClientRect()

		await drag(second, 40)

		const after = second.getBoundingClientRect()

		expect(Math.abs(after.left - before.left)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(after.right - (before.right + 40))).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(first) - 170)).toBeLessThanOrEqual(EPSILON)
	})

	/**
	 * Сторож задачи. Колонку без своей ширины тема раскладывала, не глядя на
	 * границы: колонка с границами 120–360 вставала шире места, которое ей
	 * давала раскладка, — во всю таблицу, — и первая же протяжка или клавиша
	 * ставила её в границу рывком. Ядро раскладывает её в границах сразу, и
	 * ручка берёт её от того, что видно.
	 */
	describe('колонка без ширины с границами в широком месте', () => {
		const BOUNDED: TTableColumnSource = {
			field: 'name',
			text: 'Имя',
			rowHeader: true,
			resizable: true,
			minWidth: 120,
			maxWidth: 360,
		}

		/** Таблица с одной такой колонкой: место дало бы ей 400 px. */
		async function mountBounded(): Promise<{ engine: TTableCollection; header: HTMLElement }> {
			const engine = resizeEngine([BOUNDED])

			await mount(engine, PLACE)

			const [header] = headers()

			// В своей границе, а не во всё место
			await expect.poll(() => width(header)).toBe(360)

			return { engine, header }
		}

		it('сразу в границах: у верхней, а не во всю ширину места; своей ширины нет', async () => {
			const { engine, header } = await mountBounded()

			expect(columnOf(engine, 'name').width).toBe(360)
			expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
			expect(header.dataset.sized).toBe('true')
			// Все гибкие упёрлись в границы — таблица уже места
			expect(width(find('.s-table'))).toBe(360)
		})

		it('первая стрелка к сужению — ровно шаг, без рывка', async () => {
			const { engine, header } = await mountBounded()
			const field = fieldOf(header)

			field.focus()
			await userEvent.keyboard('{ArrowLeft}')

			expect(columnOf(engine, 'name').width).toBe(350)
			await expect.poll(() => width(header)).toBe(350)
			expect(field.value).toBe('350')
		})

		it('первая протяжка — ровно на Δ', async () => {
			const { engine, header } = await mountBounded()

			await drag(header, -40)

			expect(columnOf(engine, 'name').width).toBe(320)
			expect(Math.abs(width(header) - 320)).toBeLessThanOrEqual(EPSILON)
		})

		it('протяжка за верхнюю границу — колонка стоит у неё и остаётся гибкой', async () => {
			const { engine, header } = await mountBounded()

			await drag(header, 30)

			expect(Math.abs(width(header) - 360)).toBeLessThanOrEqual(EPSILON)
			expect(columnOf(engine, 'name').getProps().width).toBeUndefined()
		})
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

	it('полоса — зона захвата в 14 px; у последней колонки — в таблице', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const table = find('.s-table').getBoundingClientRect()
		const [name, , age] = headers()

		expect(Math.abs(width(resizerOf(name)) - 14)).toBeLessThanOrEqual(EPSILON)
		expect(Math.abs(width(resizerOf(age)) - 14)).toBeLessThanOrEqual(EPSILON)
		expect(resizerOf(age).getBoundingClientRect().right).toBeLessThanOrEqual(
			table.right + EPSILON,
		)

		// На самой границе колонок — полоса
		const edge = name.getBoundingClientRect()
		const hit = document.elementFromPoint(edge.right, edge.top + edge.height / 2)

		expect(resizerOf(name).contains(hit)).toBe(true)
	})

	/**
	 * Кнопка сортировки занимает ячейку целиком, и под ней полосе места не
	 * осталось бы: полоса — над кнопкой. У границы колонок нажатие берёт ручка,
	 * мимо полосы — кнопка, и сортирует колонку, не меняя её ширины.
	 */
	it('полоса — над кнопкой сортировки: у границы — ручка, мимо полосы — кнопка', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const [name, , age] = headers()
		const button = find('.s-table-column__sort', name)
		const edge = name.getBoundingClientRect()
		const y = edge.top + edge.height / 2

		// Своя полоса у конца и полоса соседа у начала — обе над кнопкой
		expect(resizerOf(name).contains(document.elementFromPoint(edge.right - 4, y))).toBe(true)
		expect(resizerOf(name).contains(document.elementFromPoint(edge.right + 4, y))).toBe(true)

		// Мимо полос — кнопка
		const middle = edge.left + edge.width / 2

		expect(button.contains(document.elementFromPoint(middle, y))).toBe(true)

		// Полоса последней колонки — у края таблицы, над кнопкой по концу
		const last = age.getBoundingClientRect()

		expect(resizerOf(age).contains(document.elementFromPoint(last.right - 4, y))).toBe(true)

		const body = document.body.getBoundingClientRect()

		await userEvent.click(document.body, {
			position: { x: middle - body.left, y: y - body.top },
		})

		await expect.poll(() => name.dataset.sort).toBe('asc')
		expect(Math.abs(width(name) - 120)).toBeLessThanOrEqual(EPSILON)
	})

	/**
	 * Линия ручки — 3 px и висит посередине высоты заголовка: рамок строк, линии
	 * шапки и верхнего края она не касается.
	 */
	it('линия — 3 px, висит посередине, не касаясь краёв заголовка', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const [name] = headers()
		const line = style(resizerOf(name), '::before')
		const header = name.getBoundingClientRect()
		const resizer = resizerOf(name).getBoundingClientRect()
		const top = resizer.top + parseFloat(line.top)
		const bottom = top + parseFloat(line.height)

		expect(parseFloat(line.width)).toBe(3)
		// Отступ — десятая часть высоты заголовка сверху и снизу
		expect(Math.abs(top - header.top - header.height / 10)).toBeLessThanOrEqual(EPSILON)
		expect(header.bottom - bottom).toBeGreaterThan(0)
		expect(Math.abs(top - header.top - (header.bottom - bottom))).toBeLessThanOrEqual(EPSILON)
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

	/**
	 * Указатель, который прошёл через полосу мимоходом, линию не зажигает:
	 * она ждёт, задержится ли он. Курсор ручки при этом встаёт сразу. Ручку
	 * взяли — ждать нечего, и линия встаёт без задержки и под указателем.
	 */
	it('линия ждёт задержки указателя: мимоходом не моргает; взяли ручку — сразу', async () => {
		await mount(resizeEngine(ALL), PLACE)

		const resizer = resizerOf(headers()[0])
		const line = () => style(resizer, '::before')
		const box = resizer.getBoundingClientRect()
		const y = box.top + box.height / 2

		await pointAt(box.left + box.width / 2, y)

		expect(style(resizer).cursor).toBe('col-resize')
		expect(line().opacity).toBe('0')

		// Ушёл раньше задержки — линия так и не появилась
		await pointAt(box.left + box.width / 2 + 60, y)
		await new Promise((resolve) => setTimeout(resolve, 400))

		expect(line().opacity).toBe('0')

		// Задержался — появилась
		await pointAt(box.left + box.width / 2, y)
		await expect.poll(() => line().opacity).toBe('1')

		await pointAt(box.left + box.width / 2 + 60, y)
		await expect.poll(() => line().opacity).toBe('0')

		// Нажали на полосу сразу, не дожидаясь, — без задержки
		await pointAt(box.left + box.width / 2, y)

		expect(line().transitionDelay).not.toBe('0s')

		await commands.mouseDown()

		try {
			await expect.poll(() => headers()[0].dataset.resizing).toBe('true')
			expect(line().transitionDelay).toBe('0s')
		} finally {
			await commands.mouseUp()
		}
	})
})
