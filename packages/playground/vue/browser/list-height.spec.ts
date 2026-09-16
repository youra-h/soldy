/**
 * `TListHeightPlugin` в настоящем браузере: пересчёт `max-height`, когда у
 * строк меняется только паддинг.
 *
 * Высоту строк плагин меряет `offsetHeight`, то есть по border-box, а о её
 * смене узнаёт от `ResizeObserver` на контейнере и на каждой строке. Какой бокс
 * смотрит наблюдатель, видно только здесь: в jsdom раскладки нет, а заглушка
 * наблюдателя в `setup/__tests__/helpers.ts` опцию `box` не различает.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { ListBox, ListBoxItem } from '@soldy/ui-vue'

import '@soldy/theme-oren'

/** Строк больше предела: контейнер зажат `max-height` ещё до клика. */
const OPTIONS = ['Москва', 'Тверь', 'Тула', 'Казань', 'Самара']
const MAX_ROWS = 3

/** Вертикальный паддинг строки после клика — с каждой стороны. */
const PADDING = 12

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
					class: 's-test-toggle',
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

const container = () => find('.s-list-box')
const row = () => find('.s-list-box-item')
const toggle = () => find('.s-test-toggle')

/** Высота content-box: `clientHeight` — паддинг-бокс, рамки в него не входят. */
const contentHeight = (element: HTMLElement) => {
	const style = getComputedStyle(element)

	return element.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
}

beforeEach(() => {
	// Тема читается с корня документа — тот же атрибут, что в `index.html`.
	document.documentElement.dataset.theme = 'oren'
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
