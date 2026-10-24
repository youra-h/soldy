/**
 * `TListHeightPlugin` в настоящем браузере: пересчёт `max-height`, когда у
 * строк меняется только паддинг, и где стоит предел строк у ListBox с шапкой и
 * подвалом.
 *
 * Высоту строк плагин меряет `offsetHeight`, то есть по border-box, а о её
 * смене узнаёт от `ResizeObserver` на контейнере и на каждой строке. Какой бокс
 * смотрит наблюдатель, видно только здесь: в jsdom раскладки нет, а заглушка
 * наблюдателя в `setup/__tests__/helpers.ts` опцию `box` не различает.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Button, Input, ListBox, ListBoxItem } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Строк больше предела: контейнер зажат `max-height` ещё до клика. */
const OPTIONS = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара']
const MAX_ROWS = 3

/** Вертикальный паддинг строки после клика — с каждой стороны. */
const PADDING = 12

/** Допуск на субпиксельное округление, px. */
const EPSILON = 1

/**
 * Список, у строк которого кликом растёт только вертикальный паддинг:
 * содержимое то же, content-box строки прежний, border-box вырос.
 *
 * Высота строкам не задаётся: в теме глобально `border-box`, и при нём
 * фиксированная `height` удержала бы внешний размер — паддинг ушёл бы из
 * content-box. Кликают по кнопке рядом, а не по строке: клик по строке меняет
 * выбор.
 */
const PaddedRowsHarness = defineComponent({
	data() {
		return { padded: false }
	},
	render() {
		return h('div', [
			h(
				'button',
				{
					class: 'so-test-toggle',
					onClick: () => {
						this.padded = true
					},
				},
				'padding',
			),
			h(
				ListBox,
				{ maxRows: MAX_ROWS },
				{
					default: () =>
						OPTIONS.map((text, index) =>
							h(ListBoxItem, {
								key: text,
								value: String(index),
								text,
								style: `padding-block: ${this.padded ? PADDING : 0}px`,
							}),
						),
				},
			),
		])
	},
})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/**
 * Контейнер строк — узел списка в корне: предел плагин ставит родителю
 * элементов, и прокручивается он.
 */
const container = () => find('.so-list-box > .so-list-box__list')
const row = () => find('.so-list-box-item')
const toggle = () => find('.so-test-toggle')

/** Высота content-box: `clientHeight` — паддинг-бокс, рамки в него не входят. */
const contentHeight = (element: HTMLElement) => {
	const style = getComputedStyle(element)

	return element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
}

/** Несколько кадров: предел плагина и раскладка после него. */
async function frames(count = 3): Promise<void> {
	for (let index = 0; index < count; index++) {
		await new Promise((resolve) => requestAnimationFrame(resolve))
	}
}

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe('пересчёт без смены содержимого', () => {
	/**
	 * Наблюдатели смотрят border-box — ровно то, что плагин меряет
	 * `offsetHeight`. Контейнер зажат `max-height`, поэтому от выросших строк
	 * его content-box не меняется и наблюдатель корня молчит; content-box самих
	 * строк тоже прежний. С умолчанием `content-box` уведомления не было бы ни
	 * от кого, и предел держался бы по старой высоте строк.
	 */
	it('у строк вырос только вертикальный паддинг — max-height контейнера пересчитан', async () => {
		render(PaddedRowsHarness)

		// Прокрутка включается, только когда строк на странице больше предела:
		// предел к этому моменту посчитан по `MAX_ROWS` строкам одной высоты и
		// до клика больше не меняется.
		await expect.poll(() => container().style.overflowY).toBe('auto')

		const maxHeight = parseFloat(container().style.maxHeight)
		const rowHeight = row().offsetHeight
		const rowContent = contentHeight(row())

		await userEvent.click(toggle())

		// Сначала убеждаемся, что вырос именно border-box строки, а content-box
		// прежний: иначе проверка ниже прошла бы на неподвижном пределе или
		// сторожила бы не border-box.
		await expect.poll(() => row().offsetHeight).toBe(rowHeight + 2 * PADDING)
		expect(contentHeight(row())).toBe(rowContent)

		await expect
			.poll(() => parseFloat(container().style.maxHeight))
			.toBe(maxHeight + MAX_ROWS * 2 * PADDING)
	})
})

/**
 * Шапка и подвал ListBox стоят в корне рядом с узлом списка, а прокручивается
 * узел списка — родитель элементов, которому плагин ставит предел. Поэтому в
 * пределе ровно `maxRows` строк, а поле шапки и кнопка подвала видны при любой
 * прокрутке. Прокручивайся корень, фокус, пришедший Tab-ом из поля шапки на
 * узел списка, увёл бы шапку из виду: браузер докручивает к узлу, который
 * получил фокус, а узел списка внутри прокрутки корня.
 */
describe('шапка и подвал — на месте, прокручивается список', () => {
	const CITIES = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара', 'Пермь', 'Омск', 'Уфа']

	async function mount(): Promise<void> {
		render(
			defineComponent({
				render: () =>
					h(
						ListBox,
						{ maxRows: MAX_ROWS },
						{
							header: () => h(Input, { class: 'so-test-header' }),
							default: () =>
								CITIES.map((text) =>
									h(ListBoxItem, { key: text, value: text, text }),
								),
							footer: () => h(Button, { class: 'so-test-footer', text: 'Готово' }),
						},
					),
			}),
		)

		await expect.poll(() => container().style.overflowY).toBe('auto')
		await frames()
	}

	it('в пределе — ровно maxRows строк, без шапки и подвала', async () => {
		await mount()

		const [first, second] = [...document.querySelectorAll<HTMLElement>('.so-list-box-item')]
		const step = second.getBoundingClientRect().top - first.getBoundingClientRect().top
		const gap = step - first.offsetHeight

		expect(Math.abs(container().clientHeight - (MAX_ROWS * step - gap))).toBeLessThan(EPSILON)
	})

	it('список прокручен до конца — шапка и подвал на месте', async () => {
		await mount()

		const header = find('.so-test-header').getBoundingClientRect()
		const footer = find('.so-test-footer').getBoundingClientRect()

		container().scrollTop = container().scrollHeight
		await frames()

		expect(container().scrollTop).toBeGreaterThan(0)
		expect(find('.so-list-box').scrollTop).toBe(0)
		expect(find('.so-test-header').getBoundingClientRect().top).toBe(header.top)
		expect(find('.so-test-footer').getBoundingClientRect().top).toBe(footer.top)
	})

	it('Tab из поля шапки — фокус на списке, шапка не уезжает', async () => {
		await mount()

		const field = find('.so-test-header input')
		const header = find('.so-test-header').getBoundingClientRect()

		field.focus()
		await userEvent.keyboard('{Tab}')

		expect(document.activeElement).toBe(container())
		expect(find('.so-list-box').scrollTop).toBe(0)
		expect(find('.so-test-header').getBoundingClientRect().top).toBe(header.top)
	})
})
