/**
 * Размер иконки в настоящем браузере: у каждой ступени шкалы `size` в теме
 * есть размер.
 *
 * Своего размера у `svg` нет, его даёт только правило темы. Без правила
 * иконка в хосте, который сжимается по содержимому, схлопывается в 0×0: так на
 * `xl` и `2xl` пропадали крестики Tabs и Tags, очистка и стрелка Select. Хост
 * здесь такой же, как обёртка стрелки Select: в блочном хосте `svg` без
 * правила растягивается на ширину контейнера, и бокс у него ненулевой.
 * Иконка — та же, что у компонентов: глиф из `useIcon`, с `viewBox`. Без него
 * `svg` раскладывается иначе. В jsdom раскладки нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { Icon, useIcon } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

/** Глиф строится один раз: новый компонент на каждый рендер пересоздавал бы узел. */
const CLOSE = useIcon('close')

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

/** Бокс иконки размера; нет её — тест падает здесь, а не на чтении свойства. */
const iconBox = (size: string) => {
	const icon = document.querySelector(`svg.s-icon--size-${size}`)

	if (!icon) throw new Error(`иконки размера ${size} нет`)

	return icon.getBoundingClientRect()
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
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

/** Кегль у всех иконок один, поэтому бокс растёт вместе с правилом темы. */
it('бокс растёт по шкале', () => {
	render(harness(COMPONENT_SIZES))

	const boxes = COMPONENT_SIZES.map(iconBox)

	boxes.slice(1).forEach((box, index) => {
		const step = `${COMPONENT_SIZES[index]} → ${COMPONENT_SIZES[index + 1]}`

		expect(box.width, step).toBeGreaterThan(boxes[index].width)
		expect(box.height, step).toBeGreaterThan(boxes[index].height)
	})
})
