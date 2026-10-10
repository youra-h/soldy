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
import { defineComponent, h, ref, type Ref } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type {
	ITableColumn,
	TTableCollection,
	TTableColumnSource,
	TTableRecord,
} from '@soldy-ui/core'
import { Button, Table } from '@soldy-ui/vue'

import { find, opacity, pixel, settled, shift, style, systemColor } from './colors'
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
 * один, а колонка и строки стоят на месте; на месте вставки — линия. Колонка
 * встаёт на новое место одной перестановкой, когда заголовок отпустили.
 * Нажатие без протяжки остаётся нажатием кнопки сортировки, а протяжка её не
 * нажимает. Клавиши — Ctrl+Shift+←/→ на кнопке, и фокус с неё не уходит.
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

	const fieldsOf = (engine: TTableCollection) =>
		engine.extensions.columns.columns.map((column) => column.field)

	/** Середина узла. */
	function middleOf(element: Element): { x: number; y: number } {
		const box = element.getBoundingClientRect()

		return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
	}

	it('тащат заголовок — колонка и строки на месте; отпустили — колонка на новом месте', async () => {
		const engine = moveEngine()
		const moves: string[][] = []

		engine.extensions.columns.events.on('column:move', ({ order }) => moves.push(order))
		await mount(engine, PLACE)

		const [name, city] = headers()
		const cell = rows()[0].children[0]
		const from = middleOf(name)
		const before = { header: name.getBoundingClientRect(), cell: cell.getBoundingClientRect() }

		await pointAt(from.x, from.y)
		await commands.mouseDown()

		try {
			await pointAt(from.x + 40, from.y)
			await pointAt(middleOf(city).x + 10, from.y)

			// Заголовок идёт за указателем, ячейка его колонки — на месте
			const dragged = name.getBoundingClientRect()

			expect(name.dataset.dragging).toBe('true')
			expect(dragged.left - before.header.left).toBeGreaterThan(100)
			expect(
				Math.abs(cell.getBoundingClientRect().left - before.cell.left),
			).toBeLessThanOrEqual(EPSILON)
			// Метка — у конца соседа, линия видна
			expect(city.dataset.drop).toBe('after')
			expect(parseFloat(style(city, '::before').width)).toBe(3)
			expect(fieldsOf(engine)).toEqual(['name', 'city', 'age'])
		} finally {
			await commands.mouseUp()
		}

		expect(fieldsOf(engine)).toEqual(['city', 'name', 'age'])
		expect(moves).toEqual([['city', 'name', 'age']])

		await expect
			.poll(() => headers().map((header) => header.textContent?.trim()))
			.toEqual(['Город', 'Имя', 'Возраст'])

		// Ячейки строк — в новом порядке, сдвиг заголовка снят
		expect(rows()[0].children[1].textContent?.trim()).toBe('Анна Смирнова')
		expect(headers()[1].dataset.dragging).toBeUndefined()
		expect(headers()[1].style.getPropertyValue('--s-table-column-drag')).toBe('')
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

		expect(fieldsOf(engine)).toEqual(['city', 'name', 'age'])

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
