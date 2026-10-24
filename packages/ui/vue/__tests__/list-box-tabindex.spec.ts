/**
 * Остановка Tab ListBox — узел списка: Tab фокусирует список, а не перебирает
 * элементы по одному — по APG-паттерну listbox перемещение по элементам делают
 * стрелки (`TListKeyboardPlugin`), не Tab. Фокус по строкам не ходит, и
 * элемент под стрелками называет `aria-activedescendant` узла списка — на
 * `id` подсвеченной строки.
 *
 * Список — узел внутри корня (`.so-list-box__list`): `role="listbox"` пишет
 * ядро списка, `aria-multiselectable` в `multiple` — коллекция, имя —
 * `TAriaPlugin`, и всё это приходит на узел списка набором `aria` и идёт за
 * сменой режима. Корень — рамка: в нём рядом со списком стоят шапка и подвал,
 * ведь в `listbox` ARIA пускает только опции (axe — `aria-required-children`).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { Button, Input, ListBox, ListBoxItem } from '@soldy-ui/vue'
import ListBoxHarness from './ListBox.test.vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении атрибута. */
const find = (selector: string): Element => {
	const element = document.querySelector(selector)

	if (!element) throw new Error(`${selector}: узла нет`)

	return element
}

describe('ListBox: остановка Tab — узел списка', () => {
	it('узел списка фокусируем, корень и элементы — нет', () => {
		wrapper = mount(ListBoxHarness, { attachTo: document.body })

		const root = find('.so-list-box')
		const list = find('.so-list-box__list')
		const buttons = [...document.querySelectorAll('.so-list-box-item .so-button')]

		expect(list.parentElement).toBe(root)
		expect(list.getAttribute('tabindex')).toBe('0')
		expect(root.hasAttribute('tabindex')).toBe(false)
		expect(buttons.length).toBeGreaterThan(0)
		expect(buttons.every((button) => button.getAttribute('tabindex') === '-1')).toBe(true)
	})

	it('элементы — в узле списка', () => {
		wrapper = mount(ListBoxHarness, { attachTo: document.body })

		const list = find('.so-list-box__list')
		const items = [...document.querySelectorAll('.so-list-box-item')]

		expect(items).toHaveLength(3)
		expect(items.every((item) => item.parentElement === list)).toBe(true)
	})
})

/**
 * `id` строке пишет плагин `id` элемента от монтирования, ссылку — клавиатура
 * списка в набор `aria` списка. До клавиш подсветки на экране нет — и ссылки
 * нет.
 */
describe('ListBox: элемент под стрелками — aria-activedescendant', () => {
	it('у узла списка — id подсвеченной строки, узел с ним один', async () => {
		wrapper = mount(ListBoxHarness, { attachTo: document.body })

		// Клавиатура списка слушает корень с `element:ready` — через кадр
		await new Promise((resolve) => requestAnimationFrame(resolve))

		const list = find('[role="listbox"]')
		const ids = [...document.querySelectorAll('[role="option"]')].map((option) => option.id)

		expect(ids).toHaveLength(3)
		expect(ids.every((id) => id !== '')).toBe(true)
		expect(new Set(ids).size).toBe(ids.length)
		expect(list.hasAttribute('aria-activedescendant')).toBe(false)

		for (const step of [0, 1]) {
			list.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
			)
			await nextTick()

			const reference = list.getAttribute('aria-activedescendant')

			expect(reference).toBe(ids[step])
			expect(find('[role="option"][data-highlighted="true"]').id).toBe(reference)
			expect(document.querySelectorAll(`[id="${reference}"]`)).toHaveLength(1)
		}
	})
})

describe('ListBox: роль списка', () => {
	it('в multiple узел списка — listbox с aria-multiselectable с первой отрисовки', () => {
		wrapper = mount(ListBoxHarness, { props: { mode: 'multiple' }, attachTo: document.body })

		const root = find('.so-list-box')
		const list = find('.so-list-box__list')

		expect(list.getAttribute('role')).toBe('listbox')
		expect(list.getAttribute('aria-multiselectable')).toBe('true')
		expect(root.hasAttribute('role')).toBe(false)
		expect(root.hasAttribute('aria-multiselectable')).toBe(false)
	})

	it('в single атрибута нет; смена режима ставит его и снимает', async () => {
		wrapper = mount(ListBoxHarness, { attachTo: document.body })

		const list = find('.so-list-box__list')

		expect(list.getAttribute('role')).toBe('listbox')
		expect(list.hasAttribute('aria-multiselectable')).toBe(false)

		await wrapper.setProps({ mode: 'multiple' })

		expect(list.getAttribute('aria-multiselectable')).toBe('true')

		await wrapper.setProps({ mode: 'single' })

		expect(list.hasAttribute('aria-multiselectable')).toBe(false)
		expect(list.getAttribute('role')).toBe('listbox')
	})

	it('имя от aria_label — у узла списка, а не у корня', () => {
		wrapper = mount(ListBox, {
			props: { aria_label: 'Города' },
			slots: { default: () => [h(ListBoxItem, { value: 'msk', text: 'Москва' })] },
			attachTo: document.body,
		})

		expect(find('[role="listbox"]').getAttribute('aria-label')).toBe('Города')
		expect(find('.so-list-box').hasAttribute('aria-label')).toBe(false)
	})
})

describe('ListBox: шапка и подвал — вне listbox', () => {
	it('поле шапки и кнопка подвала — в корне рядом с узлом списка', () => {
		wrapper = mount(ListBox, {
			slots: {
				header: () => h(Input),
				default: () => [h(ListBoxItem, { value: 'msk', text: 'Москва' })],
				footer: () => h(Button, { text: 'Готово' }),
			},
			attachTo: document.body,
		})

		const root = find('.so-list-box')
		const list = find('[role="listbox"]')
		const field = find('.so-list-box .so-input')
		const done = find('.so-list-box > .so-button')

		expect(list).not.toBe(root)
		expect(list.parentElement).toBe(root)
		expect(list.contains(field)).toBe(false)
		expect(list.contains(done)).toBe(false)
		// Порядок: шапка, список, подвал
		expect([...root.children]).toEqual([field, list, done])
		// Внутри listbox — только опции
		expect([...list.children].every((child) => child.matches('.so-list-box-item'))).toBe(true)
	})

	it('empty — внутри списка, пока элементов нет', () => {
		wrapper = mount(ListBox, {
			slots: { empty: () => h('p', { class: 'so-test-empty' }, 'Пусто') },
			attachTo: document.body,
		})

		expect(find('.so-test-empty').parentElement).toBe(find('.so-list-box__list'))
	})
})
