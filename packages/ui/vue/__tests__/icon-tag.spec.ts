/**
 * Иконка без `tag` рисует `span` — так же, как в React (`icon.spec.tsx`).
 *
 * Умолчание одно, в ядре, и до шаблона его доносит описание пропа. Прежнее
 * умолчание `error` Vue рисовал неизвестным элементом молча, а React — с
 * предупреждением в консоль: одно значение вело себя в адаптерах по-разному.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { Icon } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

describe('Icon: без tag', () => {
	it('рисует span — элемент, который знает HTML', () => {
		wrapper = mount(Icon)

		expect(wrapper.element.localName).toBe('span')
		expect(wrapper.classes()).toContain('s-icon')
	})
})
