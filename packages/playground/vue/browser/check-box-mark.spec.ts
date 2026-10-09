/**
 * Отметка CheckBox в настоящем браузере — того же размера, что иконка Icon
 * того же `size`.
 *
 * Раньше отметку рисовал компонент Icon, и размер ей давало правило `.s-icon`.
 * Теперь это `svg` роли без Icon (869feq9un): размер даёт тема флажка по
 * `s-check-box__mark` теми же ступенями. Без правила `svg` в коробке-флексе
 * растянулся бы на её ширину. В jsdom раскладки нет.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from 'vitest-browser-vue'
import { defineComponent, h } from 'vue'
import { COMPONENT_SIZES } from '@soldy-ui/playground-shared'
import { CheckBox, Icon, useIcon } from '@soldy-ui/vue'

import '@soldy-ui/theme-oren'

const CHECK = useIcon('check')

/** Флажок и иконка одного размера — рядом, в одном кегле. */
const harness = (size: (typeof COMPONENT_SIZES)[number]) =>
	defineComponent({
		render() {
			return h('div', [
				h(CheckBox, { value: true, size }),
				h('span', { style: 'display: inline-flex' }, [h(Icon, { tag: CHECK, size })]),
			])
		},
	})

/** Бокс по селектору; нет узла — тест падает здесь, а не на чтении свойства. */
const box = (selector: string) => {
	const node = document.querySelector(selector)

	if (!node) throw new Error(`${selector}: узла нет`)

	return node.getBoundingClientRect()
}

beforeEach(() => {
	document.documentElement.dataset.theme = 'oren'
})

afterEach(() => {
	cleanup()
})

describe.each(COMPONENT_SIZES)('размер %s', (size) => {
	it('отметка — размера иконки Icon', () => {
		render(harness(size))

		const mark = box('.s-check-box__mark')
		const icon = box('.s-icon')

		expect(mark.width).toBeGreaterThan(0)
		expect([mark.width, mark.height]).toEqual([icon.width, icon.height])
	})
})
