/**
 * Select в окне (обёртка `Virtual`) в настоящем браузере: список панели рисует
 * только видимые опции, а на месте остальных — распорки той же высоты.
 *
 * Что попадает в окно, считает ядро (`core/__tests__/select-virtual.spec.ts`),
 * замер — плагин (`plugins/__tests__/virtual.plugin.spec.ts`), клавиатура в
 * окне — `plugins/__tests__/select-keyboard-window.plugin.spec.ts`. Здесь то,
 * чего jsdom не считает: панель скрыта до открытия, и замерить её нечем;
 * список панели прокручивается сам; клавиши уводят подсветку к опции, которой
 * не было в документе, и `aria-activedescendant` указывает на её узел, а сама
 * она прокручена к глазу; поле и теги показывают выбор, а не узлы.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Select, Virtual } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

const COUNT = 1000

/**
 * Опция с особой первой буквой — к ней ведёт набор по буквам. Буква латинская:
 * знак не с раскладки US Playwright печатает без `keydown`, а набор по буквам
 * слушает клавиши.
 */
const ZETA = 700

const ITEMS = Array.from({ length: COUNT }, (_, index) => ({
	value: `v${index + 1}`,
	text: index === ZETA ? 'Zeta' : `Пункт ${index + 1}`,
}))

/** Несколько кадров: замер плагина, перерисовка окна, узлы новых опций и прокрутка. */
async function frames(count = 8): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/**
 * Select в обёртке `Virtual`: тысяча опций данными. Прокрутка к подсвеченной
 * — мгновенная: плавная тянулась бы через кадры теста.
 */
async function mount(props: Record<string, unknown> = {}): Promise<void> {
	render(
		defineComponent({
			render: () =>
				h('div', { style: 'padding: 40px; width: 320px' }, [
					h(Virtual, () =>
						h(Select, { items: ITEMS, scrollBehavior: 'instant', ...props }),
					),
				]),
		}),
	)

	await frames()
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string): HTMLElement {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const field = () => find('.s-select__field input')
const panel = () => find('.s-select__panel')
const list = () => find('.s-select__list')

/** Нарисованные опции. */
const drawn = (): HTMLElement[] => [
	...document.querySelectorAll<HTMLElement>('.s-select__list .s-select-item'),
]

/** Опция по тексту, если она в документе. */
const optionOf = (text: string): HTMLElement | undefined =>
	drawn().find((option) => option.textContent?.trim() === text)

/** Строка опции — на ней набор `aria` опции: `id`, `aria-selected`, место в наборе. */
function rowOf(text: string): HTMLElement {
	const row = optionOf(text)?.querySelector(':scope > .s-button')

	if (!(row instanceof HTMLElement)) throw new Error(`${text}: строки нет`)

	return row
}

/** Шаг опций: расстояние между верхами двух первых нарисованных. */
function step(): number {
	const [first, second] = drawn()

	return second.getBoundingClientRect().top - first.getBoundingClientRect().top
}

/** Опция видна в окне списка целиком. */
function inView(option: HTMLElement): boolean {
	const box = list().getBoundingClientRect()
	const rect = option.getBoundingClientRect()

	return rect.top >= box.top - EPSILON && rect.bottom <= box.bottom + EPSILON
}

/** Узел, на который ссылается поле: `aria-activedescendant` — `id` в документе. */
function activeDescendant(): HTMLElement | null {
	const id = field().getAttribute('aria-activedescendant')

	return id ? document.getElementById(id) : null
}

/**
 * Подсвеченная опция: в документе, отмечена, прокручена к глазу, и поле
 * ссылается ровно на её строку.
 */
function expectHighlighted(text: string): void {
	const option = optionOf(text)

	if (!option) throw new Error(`${text}: подсвеченной опции нет в документе`)

	expect(option.dataset.highlighted).toBe('true')
	expect(inView(option)).toBe(true)
	expect(activeDescendant()).toBe(rowOf(text))
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('окно списка панели', () => {
	it('до первого открытия в закрытой панели — не больше 50 опций', async () => {
		await mount()

		expect(getComputedStyle(panel()).display).toBe('none')
		expect(drawn().length).toBeGreaterThan(0)
		expect(drawn().length).toBeLessThanOrEqual(50)
	})

	it('открыта — в документе только окно, а список прокручивается во всю высоту опций', async () => {
		await mount()

		await userEvent.click(field())
		await frames()

		expect(drawn().length).toBeLessThan(60)
		// Высота прокрутки — все опции с зазорами, как без окна
		expect(Math.abs(list().scrollHeight - COUNT * step())).toBeLessThan(step())
	})

	it('нарисованным — размер набора и место в нём', async () => {
		await mount()

		await userEvent.click(field())
		await frames()

		list().scrollTop = 300 * step()
		await frames()

		const row = rowOf('Пункт 301')

		expect(row.getAttribute('aria-setsize')).toBe(String(COUNT))
		expect(row.getAttribute('aria-posinset')).toBe('301')
	})

	it('`maxRows` — высота списка по числу строк, а прокручивается он во всю высоту опций', async () => {
		const MAX_ROWS = 6

		await mount({ maxRows: MAX_ROWS })

		await userEvent.click(field())
		await frames()

		const root = list()
		const [first] = drawn()
		const style = getComputedStyle(root)
		const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
		const rows = MAX_ROWS * step() - (step() - first.getBoundingClientRect().height)

		expect(Math.abs(root.clientHeight - padding - rows)).toBeLessThan(EPSILON * 2)
		expect(
			Math.abs(root.scrollHeight - root.clientHeight - (COUNT - MAX_ROWS) * step()),
		).toBeLessThan(step())
	})
})

describe('клавиатура', () => {
	it('Enter открывает панель на выбранной опции в середине списка — она видна', async () => {
		await mount({ value: 'v500' })

		field().focus()
		await userEvent.keyboard('{Enter}')
		await frames()

		expectHighlighted('Пункт 500')
	})

	it('End и буква уводят подсветку к ненарисованной опции — ссылка на её узел в документе', async () => {
		await mount()

		field().focus()
		await userEvent.keyboard('{Enter}')
		await frames()

		await userEvent.keyboard('{End}')
		await frames()

		expectHighlighted(`Пункт ${COUNT}`)

		await userEvent.keyboard('z')
		await frames()

		expectHighlighted('Zeta')
	})

	it('Enter выбирает подсвеченную опцию вне прежнего окна', async () => {
		await mount()

		field().focus()
		await userEvent.keyboard('{Enter}')
		await frames()
		await userEvent.keyboard('{End}')
		await frames()
		await userEvent.keyboard('{Enter}')
		await frames()

		expect((field() as HTMLInputElement).value).toBe(`Пункт ${COUNT}`)
	})

	it('колесо уводит прокрутку от подсвеченной опции — она остаётся в документе, ссылка жива', async () => {
		await mount()

		field().focus()
		await userEvent.keyboard('{Enter}')
		await userEvent.keyboard('{ArrowDown}')
		await userEvent.keyboard('{ArrowDown}')
		await frames()

		const highlighted = optionOf('Пункт 3')

		expect(highlighted?.dataset.highlighted).toBe('true')

		list().scrollTop = list().scrollHeight
		await frames()

		// Окно ушло к концу списка, а подсвеченная — на своём месте среди распорок
		expect(optionOf(`Пункт ${COUNT}`)).toBeDefined()
		expect(optionOf('Пункт 3')).toBe(highlighted)
		expect(highlighted?.isConnected).toBe(true)
		expect(activeDescendant()).toBe(rowOf('Пункт 3'))
	})
})

describe('отбор в `editable`', () => {
	it('выборка сменилась — окно к подсвеченной, места в наборе — среди отобранных', async () => {
		await mount({ editable: true, editableMode: 'filter' })

		await userEvent.click(field())
		await userEvent.keyboard('Пункт 9')
		await frames()

		// «Пункт 9», «Пункт 90»–«Пункт 99» и «Пункт 900»–«Пункт 999»: окно
		list().scrollTop = list().scrollHeight
		await frames()

		await userEvent.keyboard('9')
		await frames()

		// «Пункт 99» и «Пункт 990»–«Пункт 999»: все в окне, распорок нет
		const texts = [
			'Пункт 99',
			...Array.from({ length: 10 }, (_, index) => `Пункт ${990 + index}`),
		]

		expect(drawn().map((option) => option.textContent?.trim())).toEqual(texts)
		expect(document.querySelectorAll('.s-select__filler')).toHaveLength(0)
		expect(rowOf('Пункт 99').getAttribute('aria-setsize')).toBe('11')
		expect(rowOf('Пункт 999').getAttribute('aria-posinset')).toBe('11')
		expectHighlighted('Пункт 99')
	})
})

describe('выбор вне окна', () => {
	it('single — поле показывает текст выбранной, хоть её и нет в документе', async () => {
		await mount({ value: 'v900' })

		expect(optionOf('Пункт 900')).toBeUndefined()
		expect((field() as HTMLInputElement).value).toBe('Пункт 900')
	})

	it('multiple — тег выбранной в поле, крестик тега снимает выбор', async () => {
		await mount({ mode: 'multiple', value: ['v2', 'v900'] })

		const tags = () =>
			[...document.querySelectorAll<HTMLElement>('.s-select__field .s-tags-item')]
				.map((tag) => tag.textContent?.trim())
				.sort()

		expect(optionOf('Пункт 900')).toBeUndefined()
		expect(tags()).toEqual(['Пункт 2', 'Пункт 900'])

		const tag = [
			...document.querySelectorAll<HTMLElement>('.s-select__field .s-tags-item'),
		].find((node) => node.textContent?.trim() === 'Пункт 900')
		const close = tag?.querySelector(':scope > .s-tags-item__close')

		if (!(close instanceof HTMLElement)) throw new Error('крестика тега нет')

		await userEvent.click(close)
		await frames()

		expect(tags()).toEqual(['Пункт 2'])

		// Открытая панель: прокрутка к опции — она не выбрана
		await userEvent.click(find('.s-select__arrow'))
		await frames()

		list().scrollTop = 899 * step()
		await frames()

		expect(rowOf('Пункт 900').getAttribute('aria-selected')).toBe('false')
	})
})
