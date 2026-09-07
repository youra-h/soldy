/**
 * `TabsContent` — панель таба как компонент.
 *
 * Заменила динамический слот `panel:${value}`, который резолвил только Vue и
 * потому делал панели недостижимыми в остальных пяти адаптерах.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Harness from './TabsContent.test.vue'

const render = () => mount(Harness, { attachTo: document.body })

describe('показ панели по активному табу', () => {
	it('видна только панель активного таба', () => {
		const wrapper = render()
		const panels = wrapper.findAll('.s-tabs__panel')

		expect(panels).toHaveLength(1)
		expect(panels[0].text()).toBe('Панель A')
	})

	it('переключение таба переключает панель', async () => {
		const wrapper = render()

		await wrapper.findAll('[role="tab"]')[1].trigger('click')
		await nextTick()

		const panels = wrapper.findAll('.s-tabs__panel')

		expect(panels).toHaveLength(1)
		expect(panels[0].text()).toBe('Панель B')
	})

	it('панель лежит вне списка табов', () => {
		const wrapper = render()

		// Попади она в default-слот, оказалась бы внутри [role=tablist]
		expect(wrapper.find('[role="tablist"] .s-tabs__panel').exists()).toBe(false)
		expect(wrapper.find('.s-tabs__panel').exists()).toBe(true)
	})
})

describe('связка ARIA в разметке', () => {
	it('aria-controls активного таба указывает на id его панели', () => {
		const wrapper = render()

		const tab = wrapper.findAll('[role="tab"]')[0]
		const panel = wrapper.find('.s-tabs__panel')

		expect(tab.attributes('aria-controls')).toBe(panel.attributes('id'))
	})

	it('aria-labelledby панели указывает на id таба', () => {
		const wrapper = render()

		const tab = wrapper.findAll('[role="tab"]')[0]
		const panel = wrapper.find('.s-tabs__panel')

		expect(panel.attributes('aria-labelledby')).toBe(tab.attributes('id'))
	})

	it('панель объявлена как tabpanel', () => {
		expect(render().find('.s-tabs__panel').attributes('role')).toBe('tabpanel')
	})
})

describe('aria-selected — исправленный баг', () => {
	/**
	 * Раньше `aria-selected` стоял на внешней обёртке без роли, а `role="tab"`
	 * — на вложенной кнопке. Для скринридера таб не был выбран никогда.
	 */
	it('находится на элементе с role="tab", а не на обёртке', () => {
		const wrapper = render()
		const tabs = wrapper.findAll('[role="tab"]')

		expect(tabs[0].attributes('aria-selected')).toBe('true')
		expect(tabs[1].attributes('aria-selected')).toBe('false')

		// На обёртке его быть не должно
		expect(wrapper.find('.s-tab-item').attributes('aria-selected')).toBeUndefined()
	})

	it('следует за переключением таба', async () => {
		const wrapper = render()

		await wrapper.findAll('[role="tab"]')[1].trigger('click')
		await nextTick()

		const tabs = wrapper.findAll('[role="tab"]')

		expect(tabs[0].attributes('aria-selected')).toBe('false')
		expect(tabs[1].attributes('aria-selected')).toBe('true')
	})
})
