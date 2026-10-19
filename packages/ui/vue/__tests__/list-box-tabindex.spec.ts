/**
 * Roving tabindex ListBox: Tab фокусирует контейнер, а не перебирает элементы
 * по одному — по APG-паттерну listbox перемещение по элементам делают стрелки
 * (`TListKeyboardPlugin`), не Tab.
 *
 * Контейнер — сам список: `role="listbox"` пишет ядро списка, а
 * `aria-multiselectable` в `multiple` — коллекция. Оба приходят на корень
 * набором `aria` и идут за сменой режима.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ListBoxHarness from './ListBox.test.vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

describe('ListBox: tabindex элементов', () => {
	it('контейнер фокусируем, элементы — нет', () => {
		wrapper = mount(ListBoxHarness, { attachTo: document.body })

		const container = document.querySelector('.so-list-box')
		const buttons = [...document.querySelectorAll('.so-list-box-item .so-button')]

		expect(container?.getAttribute('tabindex')).toBe('0')
		expect(buttons.length).toBeGreaterThan(0)
		expect(buttons.every((button) => button.getAttribute('tabindex') === '-1')).toBe(true)
	})
})

describe('ListBox: роль списка', () => {
	it('в multiple корень — listbox с aria-multiselectable с первой отрисовки', () => {
		wrapper = mount(ListBoxHarness, { props: { mode: 'multiple' }, attachTo: document.body })

		const container = document.querySelector('.so-list-box')

		expect(container?.getAttribute('role')).toBe('listbox')
		expect(container?.getAttribute('aria-multiselectable')).toBe('true')
	})

	it('в single атрибута нет; смена режима ставит его и снимает', async () => {
		wrapper = mount(ListBoxHarness, { attachTo: document.body })

		const container = document.querySelector('.so-list-box')

		expect(container?.getAttribute('role')).toBe('listbox')
		expect(container?.hasAttribute('aria-multiselectable')).toBe(false)

		await wrapper.setProps({ mode: 'multiple' })

		expect(container?.getAttribute('aria-multiselectable')).toBe('true')

		await wrapper.setProps({ mode: 'single' })

		expect(container?.hasAttribute('aria-multiselectable')).toBe(false)
		expect(container?.getAttribute('role')).toBe('listbox')
	})
})
