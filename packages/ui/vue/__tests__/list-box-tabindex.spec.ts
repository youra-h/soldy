/**
 * Roving tabindex ListBox: Tab фокусирует контейнер, а не перебирает элементы
 * по одному — по APG-паттерну listbox перемещение по элементам делают стрелки
 * (`TListKeyboardPlugin`), не Tab.
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

		const container = document.querySelector('.s-list-box')
		const buttons = [...document.querySelectorAll('.s-list-box-item .s-button')]

		expect(container?.getAttribute('tabindex')).toBe('0')
		expect(buttons.length).toBeGreaterThan(0)
		expect(buttons.every((button) => button.getAttribute('tabindex') === '-1')).toBe(true)
	})
})
