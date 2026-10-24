/**
 * Общий слой тем без темы — таблица: страница только с CSS базы
 * (`@soldy-ui/theme-base`), без `@soldy-ui/theme-oren`.
 *
 * Структура Table — раскладка и механика — лежит в базе, а облик и движение в
 * теме (`packages/themes/base/AGENTS.md`, «Перенос структуры»). Без темы
 * таблица голая — без цвета, линий, вуалей и переходов, — но рабочая, и здесь
 * это проверяется тем, что видит пользователь, а не числами базы: таблица с
 * известными ширинами колонок — шириной в их сумму, а не во всю ширину места;
 * колонки шире места — окно прокручивает таблицу вбок, а с закреплённой шапкой
 * — нет, вбок прокручивает контейнер; закреплённая шапка стоит у верха окна
 * прокрутки, и строки, ушедшие под неё, не просвечивают и нажатий над ней не
 * ловят; ячейка, куда фокус ушёл после ↑, встаёт ниже шапки — и когда подписи
 * переносятся, а высоту шапки пишет поведение темы (`useTheme` в
 * `browser/setup.ts` CSS не несёт). Спеки с темой держат базу под темой, и
 * потерянное ею правило тема могла бы закрыть своим, а сторожа CSS
 * (`themes/base/__tests__/`) раскладки не считают.
 *
 * Своей поверхности у таблицы нет: непрозрачный фон закреплённой шапки —
 * поверхность места (`--so-place-surface`), а её объявляет место. Здесь место —
 * карточка спека со своим фоном и тем же объявлением рядом, как у приложения.
 *
 * Страница у файла спека своя (`isolate` прогона), и листа темы на ней нет —
 * это проверяет первый тест. Проверен поломкой: без нулевой ширины у таблицы
 * с `data-sized` (`components/table.css`) она встаёт во всю ширину места, без
 * прокрутки окна по `data-overflow` таблица выходит за окно, а окно стоит, без
 * `sticky` шапка уезжает со строками, без подложки цветом места или без подъёма
 * шапки над телом строки и чекбоксы проступают на снимке шапки, а без отступа
 * прокрутки к фокусу ячейка после ↑ встаёт под шапку.
 */

import { describe, it, expect, afterAll, afterEach, beforeAll } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { page, userEvent } from 'vitest/browser'
import { defineComponent, h, nextTick, type VNode } from 'vue'
import { createEngineTable } from '@soldy-ui/core'
import type { TSelectionMode, TTableCollection, TTableColumnSource } from '@soldy-ui/core'
import { Table } from '@soldy-ui/vue'

import '@soldy-ui/theme-base'

/** Допуск на субпиксельное округление координат, px. */
const EPSILON = 1

/** Фон места спека и поверхность места, которую оно объявляет рядом. */
const PLACE = 'background: rgb(255 255 255); --so-place-surface: rgb(255 255 255)'

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', rowHeader: true }
const CITY: TTableColumnSource = { field: 'city', text: 'Город' }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', align: 'end' }

/**
 * Подписи, которые переносятся: шапка выше строки шапки, и отступ прокрутки к
 * фокусу верен, только пока её высоту пишет поведение темы.
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
	engine.extensions.selection.mode = options.mode ?? 'none'
	engine.extensions.grid.grid = options.grid ?? false

	return engine
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/** Разметка на странице и кадры: узлы плагины получают по `ready`, кадром. */
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

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, root: ParentNode = document): HTMLElement {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const box = (element: Element) => element.getBoundingClientRect()

const width = (element: Element) => box(element).width

/** Таблица — её корень `table`, окно — узел вокруг неё. */
const table = () => find('table.so-table')
const viewport = () => find('.so-table__viewport')
const head = () => find('.so-table__head')

/** Заголовки колонок и строки тела — по порядку. */
const headers = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.so-table-column')]
const rows = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.so-table-row')]

/** Таблица в контейнере прокрутки заданной высоты и ширины. */
const scrollBox = (content: VNode, height = 240, boxWidth = 400): VNode =>
	h(
		'div',
		{
			class: 'so-test-scroll',
			style: `width: ${boxWidth}px; height: ${height}px; overflow: auto`,
		},
		[content],
	)

/** Таблица с закреплённой шапкой. */
const sticky = (engine: TTableCollection): VNode =>
	h(Table, { engine, stickyHead: true, aria_label: 'Строки' })

/** Прокрутить контейнер так, чтобы верх строки встал вровень с низом шапки. */
async function rowUnderHead(scroller: HTMLElement, row: Element): Promise<void> {
	scroller.scrollTop += box(row).top - box(head()).bottom
	await nextFrame()
	await nextFrame()
}

/**
 * Окно — не больше рамки прогона: окно больше неё браузер масштабирует, края на
 * снимке шапки сглаживаются, и снимки расходятся сами. Окно у файла одно — оно и
 * у остальных тестов.
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
 * Ширины колонок раскладывает ядро, а место мерит плагин кадром позже
 * монтирования, поэтому раскладку тест ждёт опросом.
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

		// Середина поля чекбокса строки — посередине шапки
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
	 * Что строки под шапкой не просвечивают, видно только в том, что браузер
	 * нарисовал: снимок шапки, под которую ушли строки, — тот же, что без
	 * прокрутки. Ячейки и чекбоксы тела — ярким цветом стилем спека: чекбокс
	 * позиционирован, и шапку над ним держит только её подъём.
	 */
	describe('строки под шапкой не просвечивают', () => {
		/** Прокрутки, на которых под шапку заходят строки и их чекбоксы. */
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
	})

	/**
	 * Фокус ниже шапки. Узел, на который ушёл фокус, браузер доводит до окна
	 * прокрутки, а закреплённая шапка стоит внутри окна — и без отступа прокрутки
	 * ячейка сетки после ↑ оставалась бы под ней. Отступ — высота шапки, которую
	 * пишет поведение темы: подписи переносятся, и шапка бывает выше строки.
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

		it.each(LABELS)('$name: ↑ на ячейку под шапкой', async ({ columns, tall }) => {
			await show(() => scrollBox(sticky(engineOf(40, { columns, grid: true })), 480, 300))

			const height = box(head()).height
			const row = box(rows()[0]).height

			if (tall) expect(height, 'шапка выше строки').toBeGreaterThan(row * 1.5)
			else expect(height, 'шапка — в строку').toBeLessThan(row)

			await rowUnderHead(find('.so-test-scroll'), rows()[20])
			await userEvent.click(cellOf(20))

			expect(document.activeElement).toBe(cellOf(20))
			// Строка выше — под шапкой
			expect(box(cellOf(19)).top).toBeLessThan(box(head()).bottom - EPSILON)

			await userEvent.keyboard('{ArrowUp}')

			expect(document.activeElement).toBe(cellOf(19))
			expect(box(cellOf(19)).top, 'ячейка — ниже шапки').toBeGreaterThanOrEqual(
				box(head()).bottom - EPSILON,
			)
		})
	})
})
