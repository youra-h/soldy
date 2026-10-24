/**
 * Размер иконки в настоящем браузере: у каждой ступени шкалы `size` в теме
 * есть размер.
 *
 * Своего размера у `svg` нет, его даёт только правило темы. Без правила
 * иконка в хосте, который сжимается по содержимому, схлопывается в 0×0: так на
 * `xl` и `2xl` пропадали крестики Tabs и Tags, очистка и стрелка Select. Хост
 * здесь — строчный флекс по содержимому, какой была обёртка стрелки Select: в
 * блочном хосте `svg` без правила растягивается на ширину контейнера, и бокс у
 * него ненулевой.
 * Иконка — та же, что у компонентов: глиф из `roleIcon`, с `viewBox`. Без него
 * `svg` раскладывается иначе. В jsdom раскладки нет.
 *
 * Корень другого тега берёт тот же размер: `span` — корень `<Icon>` без тега и
 * элемента Web Components `<span is="so-icon">`, — потому что тема делает
 * корень иконки любого тега блоком, как `svg` библиотеки под своим сбросом.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from './render'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Icon, roleIcon } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Глиф строится один раз: новый компонент на каждый рендер пересоздавал бы узел. */
const CLOSE = roleIcon('close')

/** Иконки заданных размеров, каждая в своём хосте, сжатом по содержимому. */
const harness = (sizes: readonly (typeof COMPONENT_SIZES)[number][]) =>
	defineComponent({
		render() {
			return h(
				'div',
				sizes.map((size) =>
					h('span', { key: size, style: 'display: inline-flex' }, [
						h(Icon, { tag: CLOSE, size }),
					]),
				),
			)
		},
	})

/**
 * Бокс иконки размера с корнем этого тега; нет её — тест падает здесь, а не на
 * чтении свойства.
 */
const iconBox = (size: string, root = 'svg') => {
	const icon = document.querySelector(`${root}.so-icon--size-${size}`)

	if (!icon) throw new Error(`иконки размера ${size} с корнем ${root} нет`)

	return icon.getBoundingClientRect()
}

beforeEach(() => {
	document.documentElement.dataset.soTheme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(COMPONENT_SIZES)('размер %s', (size) => {
	it('у иконки ненулевой бокс', () => {
		render(harness([size]))

		const { width, height } = iconBox(size)

		expect(width).toBeGreaterThan(0)
		expect(height).toBeGreaterThan(0)
	})
})

/**
 * Хост — блочный, как строка текста: в нём строчный `span` размер не берёт
 * вовсе, и иконка оставалась без ширины. Флекс-хост, как выше, этого не
 * покажет — ребёнок флекса блочный и без правила темы.
 */
describe.each(COMPONENT_SIZES)('размер %s · корень span', (size) => {
	it('бокс — тот же, что у корня svg', () => {
		render(
			defineComponent({
				render: () =>
					h('div', [
						h('div', [h(Icon, { tag: CLOSE, size })]),
						h('div', [h(Icon, { size })]),
					]),
			}),
		)

		const svg = iconBox(size)
		const span = iconBox(size, 'span')

		expect(span.width).toBeGreaterThan(0)
		expect([span.width, span.height]).toEqual([svg.width, svg.height])
	})
})

/** Кегль у всех иконок один, поэтому бокс растёт вместе с правилом темы. */
it('бокс растёт по шкале', () => {
	render(harness(COMPONENT_SIZES))

	const boxes = COMPONENT_SIZES.map((size) => iconBox(size))

	boxes.slice(1).forEach((box, index) => {
		const step = `${COMPONENT_SIZES[index]} → ${COMPONENT_SIZES[index + 1]}`

		expect(box.width, step).toBeGreaterThan(boxes[index].width)
		expect(box.height, step).toBeGreaterThan(boxes[index].height)
	})
})
