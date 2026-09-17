/**
 * Кнопка закрытия таба в настоящем браузере: вид закрываемого таба прежний.
 *
 * Крестик был последней частью строки-Button: перед ним зазор строки, после —
 * её паддинг, высота — контент строки, кегль — строки. Наведение на него
 * проявляло строку, фон активного таба и подчёркивание покрывали его вместе
 * со строкой. Теперь крестик — сосед строки в обёртке элемента (иначе он
 * вложенная кнопка в `role="tab"`, см. `ui/vue/__tests__/tabs-close.spec.ts`),
 * и всё это тема держит сама. Проверки не знают, как именно: каждая сверяет
 * крестик со строкой, а не с числами темы. В jsdom раскладки нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { userEvent } from 'vitest/browser'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy/playground-shared'
import { Tabs, TabsItem } from '@soldy/ui-vue'

import '@soldy/theme-oren'

/** Табы с крестиком: активный, обычный и выключенный. */
const harness = (tabs: Record<string, unknown>, dir: 'ltr' | 'rtl' = 'ltr') =>
	defineComponent({
		render() {
			return h('div', { style: 'width: 640px', dir }, [
				h(Tabs, { closable: true, ...tabs }, () => [
					h(TabsItem, { key: 'a', value: 'a', text: 'Настройки', active: true }),
					h(TabsItem, { key: 'b', value: 'b', text: 'Почта' }),
					h(TabsItem, { key: 'c', value: 'c', text: 'Архив', disabled: true }),
				]),
			])
		},
	})

/** Узел по селектору внутри корня; нет его — тест падает здесь, а не на чтении свойства. */
const find = (selector: string, root: ParentNode = document): HTMLElement => {
	const element = root.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Элемент таба и его части. */
const tab = (value: 'a' | 'b' | 'c') => {
	const items = [...document.querySelectorAll('.s-tabs-item')]
	const item = items[['a', 'b', 'c'].indexOf(value)]

	if (!(item instanceof HTMLElement)) throw new Error(`таба ${value} нет`)

	return {
		item,
		row: find('[role="tab"]', item),
		text: find('.s-button__text', item),
		close: find('.s-tabs-item__close', item),
	}
}

const box = (element: Element) => element.getBoundingClientRect()

const px = (value: string) => parseFloat(value)

/**
 * Прозрачность, с которой узел виден на странице: своя, умноженная на
 * прозрачность предков до элемента таба. Так крестик внутри строки и крестик
 * рядом с ней сравниваются честно.
 */
const visibleOpacity = (element: Element, item: Element) => {
	let opacity = 1

	for (let node: Element | null = element; node && node !== item; node = node.parentElement) {
		opacity *= px(getComputedStyle(node).opacity)
	}

	return opacity
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(COMPONENT_SIZES)('размер %s: крестик на месте последней части строки', (size) => {
	it('перед крестиком зазор строки, после — её паддинг', () => {
		render(harness({ size }))

		const { item, row, text, close } = tab('a')
		const style = getComputedStyle(row)

		expect(box(close).left - box(text).right).toBeCloseTo(px(style.columnGap), 1)
		expect(box(item).right - box(close).right).toBeCloseTo(px(style.paddingLeft), 1)
	})

	/**
	 * Одно отличие от прежнего вида есть, на `2xl`: внутри строки крестик был
	 * размера Button по умолчанию, и его высоту резала размерная высота
	 * `normal` — 32px при контенте строки 36px. Теперь размер у крестика —
	 * размер таба, и правило одно на все размеры.
	 */
	it('по высоте — контент строки, по центру строки', () => {
		render(harness({ size }))

		const { row, close } = tab('a')
		const style = getComputedStyle(row)
		const rowBox = box(row)
		const closeBox = box(close)

		expect(closeBox.height).toBeCloseTo(
			rowBox.height - px(style.paddingTop) - px(style.paddingBottom),
			1,
		)
		expect(closeBox.top + closeBox.height / 2).toBeCloseTo(rowBox.top + rowBox.height / 2, 1)
	})

	it('кегль — строки: от него считается размер иконки', () => {
		render(harness({ size }))

		const { row, close } = tab('a')

		expect(getComputedStyle(close).fontSize).toBe(getComputedStyle(row).fontSize)
	})
})

describe('направление письма', () => {
	it('в RTL крестик слева от текста: зазор и паддинг зеркальны', () => {
		render(harness({}, 'rtl'))

		const { item, row, text, close } = tab('a')
		const style = getComputedStyle(row)

		expect(box(text).left - box(close).right).toBeCloseTo(px(style.columnGap), 1)
		expect(box(close).left - box(item).left).toBeCloseTo(px(style.paddingRight), 1)
	})
})

describe('таб покрывает крестик', () => {
	it('подчёркивание view="line" идёт и под крестиком', async () => {
		render(harness({ view: 'line' }))

		const list = find('.s-tabs__list')
		const { item, close } = tab('a')

		await expect
			.poll(() => px(list.style.getPropertyValue('--underline-size')))
			.toBe(item.offsetWidth)

		const start = px(list.style.getPropertyValue('--underline-pos'))
		const end = start + px(list.style.getPropertyValue('--underline-size'))
		const closeBox = box(close)
		const left = box(list).left

		expect(closeBox.left - left).toBeGreaterThanOrEqual(start)
		expect(closeBox.right - left).toBeLessThanOrEqual(end)
	})

	/**
	 * Карточка — ближайший к крестику узел с фоном. Она обязана быть табом
	 * целиком: не одной строкой (крестик остался бы за краем) и не списком.
	 */
	it('карточка активного таба view="contained" — весь таб вместе с крестиком', async () => {
		render(harness({ view: 'contained' }))

		const { item, close } = tab('a')

		const card = () => {
			let node = close.parentElement

			while (node && getComputedStyle(node).backgroundColor === 'rgba(0, 0, 0, 0)') {
				node = node.parentElement
			}

			return node
		}

		await expect.poll(() => card()?.classList.contains('s-tabs__list')).toBe(false)

		const cardBox = box(card() ?? document.body)
		const closeBox = box(close)

		expect(cardBox.width).toBeCloseTo(box(item).width, 1)
		expect(closeBox.left).toBeGreaterThanOrEqual(cardBox.left)
		expect(closeBox.right).toBeLessThanOrEqual(cardBox.right)
	})
})

describe('прозрачность крестика — прозрачность строки', () => {
	it('у неактивного, активного и выключенного таба', () => {
		render(harness({}))

		for (const value of ['a', 'b', 'c'] as const) {
			const { item, row, close } = tab(value)

			expect(visibleOpacity(close, item), value).toBeCloseTo(visibleOpacity(row, item), 2)
		}
	})

	it('наведение на крестик проявляет и строку таба', async () => {
		render(harness({}))

		const { item, row, close } = tab('b')
		const before = visibleOpacity(row, item)

		await userEvent.hover(close)

		expect(visibleOpacity(row, item)).toBeGreaterThan(before)
		expect(visibleOpacity(close, item)).toBeCloseTo(visibleOpacity(row, item), 2)
	})
})
