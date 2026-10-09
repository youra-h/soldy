/**
 * ListBox в окне (обёртка `Virtual`) в настоящем браузере: в документе только
 * видимые элементы, а на месте остальных — распорки той же высоты.
 *
 * Что попадает в окно, считает ядро (`core/__tests__/collection.draw.spec.ts`),
 * замер — плагин (`plugins/__tests__/virtual.plugin.spec.ts`), закрепление
 * подсветки — навигация (`plugins/__tests__/list-navigation-window.plugin.spec.ts`).
 * Здесь то, чего jsdom не считает: список с пределом строк прокручивается сам,
 * шаг — элемент и зазор темы, стрелки уводят подсветку к элементу, которого не
 * было в документе, и он оказывается в нём подсвеченным и прокрученным к
 * глазу, а колесо не уносит фокус со строки.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { ListBox, Virtual } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

const COUNT = 1000
const MAX_ROWS = 8

const ITEMS = Array.from({ length: COUNT }, (_, index) => ({
	value: `v${index + 1}`,
	text: `Пункт ${index + 1}`,
}))

/** Несколько кадров: замер плагина, перерисовка окна и узлы новых элементов. */
async function frames(count = 4): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

/**
 * Список в обёртке `Virtual`: тысяча элементов данными, предел строк — список
 * прокручивается сам. Прокрутка к подсвеченному — мгновенная: плавная тянулась
 * бы через кадры теста.
 */
async function mount(): Promise<HTMLElement> {
	render(
		defineComponent({
			render: () =>
				h(Virtual, () =>
					h(ListBox, {
						items: ITEMS,
						maxRows: MAX_ROWS,
						scrollBehavior: 'instant',
						aria_label: 'Пункты',
					}),
				),
		}),
	)

	await frames()

	return list()
}

function list(): HTMLElement {
	const node = document.querySelector('.s-list-box')

	if (!(node instanceof HTMLElement)) throw new Error('списка нет')

	return node
}

/** Нарисованные элементы. */
const drawn = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('.s-list-box-item')]

/** Элемент по тексту, если он в документе. */
const itemOf = (text: string): HTMLElement | undefined =>
	drawn().find((item) => item.textContent?.trim() === text)

/** Строка элемента — на ней набор `aria` и фокус после клика. */
function rowOf(text: string): HTMLElement {
	const row = itemOf(text)?.querySelector(':scope > .s-button')

	if (!(row instanceof HTMLElement)) throw new Error(`${text}: строки нет`)

	return row
}

/** Текст элемента, который стоит у верха окна списка — сразу под рамкой и полем. */
function itemAtTop(): string | null {
	const box = list().getBoundingClientRect()

	return (
		document
			.elementFromPoint(box.left + 20, box.top + 10)
			?.closest('.s-list-box-item')
			?.textContent?.trim() ?? null
	)
}

/** Элемент виден в окне списка целиком. */
function inView(item: HTMLElement): boolean {
	const box = list().getBoundingClientRect()
	const rect = item.getBoundingClientRect()

	return rect.top >= box.top - EPSILON && rect.bottom <= box.bottom + EPSILON
}

afterEach(() => {
	cleanup()
})

describe('окно', () => {
	it('в документе — только окно, а список прокручивается во всю высоту элементов', async () => {
		const root = await mount()
		const [first, second] = drawn()
		const step = second.getBoundingClientRect().top - first.getBoundingClientRect().top

		expect(drawn().length).toBeGreaterThan(MAX_ROWS)
		expect(drawn().length).toBeLessThan(60)
		// Высота прокрутки — все элементы с зазорами, как без окна
		expect(
			Math.abs(root.scrollHeight - root.clientHeight - (COUNT - MAX_ROWS) * step),
		).toBeLessThan(step)
	})

	it('прокрутка: у верха окна — элемент своего места, и окно его не сдвигает', async () => {
		const root = await mount()
		const [first, second] = drawn()
		const step = second.getBoundingClientRect().top - first.getBoundingClientRect().top

		// Место 499 — у верха окна списка
		root.scrollTop = 499 * step
		await frames()

		const before = root.scrollTop

		expect(itemAtTop()).toBe('Пункт 500')

		await frames()

		expect(root.scrollTop).toBe(before)
		expect(itemAtTop()).toBe('Пункт 500')
	})

	it('нарисованным — размер набора и место в нём', async () => {
		const root = await mount()
		const [first, second] = drawn()
		const step = second.getBoundingClientRect().top - first.getBoundingClientRect().top

		root.scrollTop = 300 * step
		await frames()

		const row = rowOf('Пункт 301')

		expect(row.getAttribute('aria-setsize')).toBe(String(COUNT))
		expect(row.getAttribute('aria-posinset')).toBe('301')
	})
})

describe('клавиатура', () => {
	it('↓ за окно — подсвеченный элемент в документе и прокручен к глазу', async () => {
		const root = await mount()

		root.focus()

		for (let index = 0; index < 30; index++) await userEvent.keyboard('{ArrowDown}')
		await frames()

		const item = itemOf('Пункт 30')

		if (!item) throw new Error('подсвеченного элемента нет в документе')

		expect(item.dataset.highlighted).toBe('true')
		expect(inView(item)).toBe(true)
	})

	it('↑ с первого — на последний: нарисован, подсвечен, прокручен', async () => {
		const root = await mount()

		root.focus()
		await userEvent.keyboard('{ArrowDown}')
		await userEvent.keyboard('{ArrowUp}')
		await frames()

		const last = itemOf(`Пункт ${COUNT}`)

		if (!last) throw new Error('последнего элемента нет в документе')

		expect(last.dataset.highlighted).toBe('true')
		expect(inView(last)).toBe(true)
	})

	it('Enter выбирает подсвеченный элемент вне прежнего окна', async () => {
		const root = await mount()

		root.focus()
		await userEvent.keyboard('{ArrowDown}')
		await userEvent.keyboard('{ArrowUp}')
		await frames()
		await userEvent.keyboard('{Enter}')
		await frames()

		expect(rowOf(`Пункт ${COUNT}`).getAttribute('aria-selected')).toBe('true')
	})
})

it('колесо уводит прокрутку от строки с фокусом и обратно — фокус на месте', async () => {
	const root = await mount()

	await userEvent.click(rowOf('Пункт 3'))

	const focused = document.activeElement

	expect(focused).toBe(rowOf('Пункт 3'))

	root.scrollTop = root.scrollHeight
	await frames()

	expect(document.activeElement).toBe(focused)
	expect(focused?.isConnected).toBe(true)

	root.scrollTop = 0
	await frames()

	expect(document.activeElement).toBe(focused)
})
