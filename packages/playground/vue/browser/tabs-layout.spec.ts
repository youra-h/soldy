/**
 * `TTabsLayoutPlugin` в настоящем браузере: индикатор активного таба
 * пересчитывается, когда у таба меняется только паддинг.
 *
 * Подчёркивание (`view: line`) — переменные `--underline-pos`/`--underline-size`
 * на списке, посчитанные `TTabsActiveTabPlugin` по `offsetLeft`/`offsetWidth`
 * активного таба, то есть по border-box. Пересчёт запускает `change:layout` от
 * наблюдателей `TTabsLayoutPlugin`. Какой бокс они смотрят, видно только здесь:
 * в jsdom раскладки нет, а заглушка наблюдателя в `setup/__tests__/helpers.ts`
 * опцию `box` не различает.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { Tabs, TabsItem } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const TABS = ['Первый', 'Второй', 'Третий']

/** Горизонтальный паддинг активного таба после клика — с каждой стороны. */
const PADDING = 24

/**
 * Табы, у активного из которых кликом растёт только горизонтальный паддинг:
 * текст тот же, content-box таба и высота строки прежние, border-box шире.
 *
 * Ширина табу не задаётся: в теме глобально `border-box`, и при нём
 * фиксированная `width` удержала бы внешний размер — паддинг ушёл бы из
 * content-box. Кликают по кнопке рядом, а не по табу: клик по табу — это
 * активация, и пересчёт пришёл бы от неё.
 */
const PaddedTabHarness = defineComponent({
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
				Tabs,
				{ view: 'line' },
				{
					default: () =>
						TABS.map((text, index) =>
							h(TabsItem, {
								key: text,
								value: String(index),
								text,
								active: index === 0,
								style:
									index === 0
										? `padding-inline: ${this.padded ? PADDING : 0}px`
										: undefined,
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

const root = () => find('.s-tabs')
const list = () => find('.s-tabs__list')
const activeTab = () => find('.s-tabs-item[data-selected="true"]')
const toggle = () => find('.s-test-toggle')

const underlineSize = () => parseFloat(list().style.getPropertyValue('--underline-size'))

/** Ширина content-box: `clientWidth` — паддинг-бокс, рамки в него не входят. */
const contentWidth = (element: HTMLElement) => {
	const style = getComputedStyle(element)

	return element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
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
	 * Наблюдатели смотрят border-box — ровно то, что меряет `TTabsActiveTabPlugin`.
	 * У таба вырос только паддинг, строка той же высоты, и корень размера не
	 * меняет: с умолчанием `content-box` уведомления не было бы ни от таба, ни
	 * от корня, и подчёркивание держалось бы по старой ширине.
	 */
	it('у активного таба вырос только горизонтальный паддинг — --underline-size пересчитан', async () => {
		render(PaddedTabHarness)

		await expect.poll(() => underlineSize()).toBe(activeTab().offsetWidth)

		const tabWidth = activeTab().offsetWidth
		const tabContent = contentWidth(activeTab())
		const rootSize = [root().offsetWidth, root().offsetHeight]

		await userEvent.click(toggle())

		// Сначала убеждаемся, что вырос именно border-box таба, а content-box таба
		// и размер корня прежние: иначе проверка ниже прошла бы на неподвижном
		// подчёркивании или сторожила бы не border-box.
		await expect.poll(() => activeTab().offsetWidth).toBe(tabWidth + 2 * PADDING)
		expect(contentWidth(activeTab())).toBe(tabContent)
		expect([root().offsetWidth, root().offsetHeight]).toEqual(rootSize)

		await expect.poll(() => underlineSize()).toBe(tabWidth + 2 * PADDING)
	})
})
