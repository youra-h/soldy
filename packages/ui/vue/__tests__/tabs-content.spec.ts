/**
 * `TabsContent` — панель таба как компонент.
 *
 * Заменила динамический слот `panel:${value}`, который резолвил только Vue и
 * потому делал панели недостижимыми в остальных пяти адаптерах.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { Tabs, TabsItem, TabsContent } from '@soldy-ui/vue'
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

/**
 * Тема рисует вид набора от его корня дочерними комбинаторами — свой список,
 * его табы и свою панель (`themes/oren/AGENTS.md`, «Tabs: вид — от своего
 * списка»): правило для потомков досталось бы и табам в панели. Держится это
 * на разметке: список и панели — дети корня, табы — дети списка.
 */
describe('разметка, на которую опирается тема', () => {
	it('табы разметки — дети списка, список и панель — дети корня', () => {
		const wrapper = render()
		const root = wrapper.find('.s-tabs').element
		const list = wrapper.find('.s-tabs__list').element
		const items = wrapper.findAll('.s-tabs-item')

		expect(list.parentElement).toBe(root)
		expect(wrapper.find('.s-tabs__panel').element.parentElement).toBe(root)
		expect(items).toHaveLength(2)

		for (const item of items) expect(item.element.parentElement).toBe(list)

		wrapper.unmount()
	})

	it('табы из items — дети списка, список и панель — дети корня', () => {
		const wrapper = mount(Tabs, {
			props: {
				items: [
					{ value: 'a', text: 'A', _: { active: true } },
					{ value: 'b', text: 'B' },
					{ value: 'c', text: 'C' },
				],
			},
			slots: { content: () => h(TabsContent, { value: 'a' }, () => 'Панель A') },
		})
		const root = wrapper.element
		const list = wrapper.find('.s-tabs__list').element
		const items = wrapper.findAll('.s-tabs-item')

		expect(list.parentElement).toBe(root)
		expect(wrapper.find('.s-tabs__panel').element.parentElement).toBe(root)
		expect(items).toHaveLength(3)

		for (const item of items) expect(item.element.parentElement).toBe(list)

		wrapper.unmount()
	})
})

/**
 * Панель с `value` пропом: так потребитель переносит её к другому табу. Табы
 * `a` (активен) и `b`, таба `z` нет. Смена `value` меняет у панели таб, и
 * показ обязан идти за новым табом сразу, а не со следующей активацией.
 */
describe('смена value у панели', () => {
	const Rebind = {
		components: { Tabs, TabsItem, TabsContent },
		props: { panel: { type: String, required: true } },
		template: `
			<Tabs>
				<TabsItem value="a" text="First" active />
				<TabsItem value="b" text="Second" />

				<template #content>
					<TabsContent :value="panel">Панель</TabsContent>
				</template>
			</Tabs>
		`,
	}

	let wrapper: ReturnType<typeof mount> | null = null

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
	})

	const renderPanel = (panel: string) => {
		const mounted = mount(Rebind, { props: { panel }, attachTo: document.body })

		wrapper = mounted

		return mounted
	}

	it('к неактивному табу — панель прячется, его активация показывает её', async () => {
		const mounted = renderPanel('a')

		expect(mounted.find('.s-tabs__panel').exists()).toBe(true)

		await mounted.setProps({ panel: 'b' })

		expect(mounted.find('.s-tabs__panel').exists()).toBe(false)

		const second = mounted.findAll('[role="tab"]')[1]

		await second.trigger('click')
		await nextTick()

		const panel = mounted.find('.s-tabs__panel')

		expect(panel.exists()).toBe(true)
		expect(panel.attributes('aria-labelledby')).toBe(second.attributes('id'))
	})

	it('к значению без таба — панель прячется и за прежним табом не идёт', async () => {
		const mounted = renderPanel('a')

		await mounted.setProps({ panel: 'z' })

		expect(mounted.find('.s-tabs__panel').exists()).toBe(false)

		const [first, second] = mounted.findAll('[role="tab"]')

		// Прежний таб снова активен — панель уже не его
		await second.trigger('click')
		await first.trigger('click')
		await nextTick()

		expect(first.attributes('aria-selected')).toBe('true')
		expect(mounted.find('.s-tabs__panel').exists()).toBe(false)
	})

	it('из значения без таба к активному табу — панель видна и подписана им', async () => {
		const mounted = renderPanel('z')

		expect(mounted.find('.s-tabs__panel').exists()).toBe(false)

		await mounted.setProps({ panel: 'a' })

		const panel = mounted.find('.s-tabs__panel')

		expect(panel.exists()).toBe(true)
		expect(panel.attributes('aria-labelledby')).toBe(
			mounted.findAll('[role="tab"]')[0].attributes('id'),
		)
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
		expect(wrapper.find('.s-tabs-item').attributes('aria-selected')).toBeUndefined()
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
