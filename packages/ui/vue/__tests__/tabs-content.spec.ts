/**
 * `TabsContent` — панель таба как компонент.
 *
 * Заменила динамический слот `panel:${value}`, который резолвил только Vue и
 * потому делал панели недостижимыми в остальных пяти адаптерах.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createEngineTabs } from '@soldy-ui/core'
import { RadioGroup, Tabs, TabsItem, TabsContent, Tags } from '@soldy-ui/vue'
import Harness from './TabsContent.test.vue'

const render = () => mount(Harness, { attachTo: document.body })

describe('показ панели по активному табу', () => {
	it('видна только панель активного таба', () => {
		const wrapper = render()
		const panels = wrapper.findAll('.so-tabs__panel')

		expect(panels).toHaveLength(1)
		expect(panels[0].text()).toBe('Панель A')
	})

	it('переключение таба переключает панель', async () => {
		const wrapper = render()

		await wrapper.findAll('[role="tab"]')[1].trigger('click')
		await nextTick()

		const panels = wrapper.findAll('.so-tabs__panel')

		expect(panels).toHaveLength(1)
		expect(panels[0].text()).toBe('Панель B')
	})

	it('панель лежит вне списка табов', () => {
		const wrapper = render()

		// Попади она в default-слот, оказалась бы внутри [role=tablist]
		expect(wrapper.find('[role="tablist"] .so-tabs__panel').exists()).toBe(false)
		expect(wrapper.find('.so-tabs__panel').exists()).toBe(true)
	})
})

/** Первый класс каждого ребёнка узла — по нему видно, какие части стоят и в каком порядке. */
const partsOf = (element: Element): string[] =>
	[...element.children].map((child) => child.className.split(' ')[0])

/** Ребёнок узла с классом; нет его — тест падает здесь, а не на чтении. */
function childOf(element: Element, className: string): Element {
	const child = [...element.children].find((each) => each.classList.contains(className))

	if (!child) throw new Error(`${className}: ребёнка нет`)

	return child
}

const ITEMS = [
	{ value: 'a', text: 'A', _: { active: true } },
	{ value: 'b', text: 'B' },
	{ value: 'c', text: 'C' },
]

/**
 * Тема рисует вид набора от его корня дочерними комбинаторами — свой ряд,
 * табы его списка и свою панель (`themes/oren/AGENTS.md`, «Tabs: вид — от
 * своего ряда»): правило для потомков досталось бы и табам в слоте или
 * панели. Держится это на разметке: ряд и панели — дети корня, список —
 * ребёнок ряда, табы — дети списка.
 */
describe('разметка, на которую опирается тема', () => {
	/** Ряд и показанная панель — дети корня, список — ребёнок ряда, табы — дети списка. */
	function expectOwnParts(root: Element, count: number): void {
		const list = childOf(childOf(root, 'so-tabs__bar'), 'so-tabs__list')
		const items = [...root.querySelectorAll('.so-tabs-item')]

		expect(root.querySelector('.so-tabs__panel')?.parentElement).toBe(root)
		expect(items).toHaveLength(count)

		for (const item of items) expect(item.parentElement).toBe(list)
	}

	it('табы разметки — дети списка, список — ребёнок ряда, ряд и панель — дети корня', () => {
		const wrapper = render()

		expectOwnParts(wrapper.find('.so-tabs').element, 2)

		wrapper.unmount()
	})

	it('табы из items — дети списка, список — ребёнок ряда, ряд и панель — дети корня', () => {
		const wrapper = mount(Tabs, {
			props: { items: ITEMS },
			slots: { content: () => h(TabsContent, { value: 'a' }, () => 'Панель A') },
		})

		expectOwnParts(wrapper.element, ITEMS.length)

		wrapper.unmount()
	})

	/**
	 * Слоты стоят в ряду по краям списка, а не в нём: в `[role=tablist]` ARIA
	 * пускает только `tab`, и кнопка в слоте была бы недопустимым потомком.
	 */
	it('leading и trailing — в ряду по краям списка, в [role=tablist] только табы', () => {
		const wrapper = mount(Tabs, {
			props: { items: ITEMS },
			slots: {
				leading: () => h('i', { class: 'head' }, 'до'),
				trailing: () => h('i', { class: 'tail' }, 'после'),
			},
		})
		const bar = childOf(wrapper.element, 'so-tabs__bar')
		const list = childOf(bar, 'so-tabs__list')

		expect(partsOf(bar)).toEqual(['so-tabs__leading', 'so-tabs__list', 'so-tabs__trailing'])
		expect(bar.hasAttribute('role'), 'ряд — разметка без роли').toBe(false)
		expect(list.getAttribute('role')).toBe('tablist')
		expect(partsOf(list)).toEqual(ITEMS.map(() => 'so-tabs-item'))
		expect(childOf(bar, 'so-tabs__leading').querySelector('.head')?.textContent).toBe('до')
		expect(childOf(bar, 'so-tabs__trailing').querySelector('.tail')?.textContent).toBe('после')

		wrapper.unmount()
	})

	it('без leading и trailing в ряду только список', () => {
		const wrapper = mount(Tabs, { props: { items: ITEMS } })

		expect(partsOf(childOf(wrapper.element, 'so-tabs__bar'))).toEqual(['so-tabs__list'])

		wrapper.unmount()
	})

	/**
	 * Выключенный набор тема гасит корнем, вместе с панелями: `data-disabled`
	 * пишет ядро, а разметка кладёт его на корень, а не на список табов.
	 */
	it('выключенность — data-disabled корня', async () => {
		const wrapper = mount(Tabs, {
			props: { disabled: true, items: [{ value: 'a', text: 'A', _: { active: true } }] },
		})

		expect(wrapper.element.getAttribute('data-disabled')).toBe('true')
		expect(wrapper.find('.so-tabs__list').attributes('data-disabled')).toBeUndefined()

		await wrapper.setProps({ disabled: false })

		expect(wrapper.element.getAttribute('data-disabled')).toBe('false')

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

		expect(mounted.find('.so-tabs__panel').exists()).toBe(true)

		await mounted.setProps({ panel: 'b' })

		expect(mounted.find('.so-tabs__panel').exists()).toBe(false)

		const second = mounted.findAll('[role="tab"]')[1]

		await second.trigger('click')
		await nextTick()

		const panel = mounted.find('.so-tabs__panel')

		expect(panel.exists()).toBe(true)
		expect(panel.attributes('aria-labelledby')).toBe(second.attributes('id'))
	})

	it('к значению без таба — панель прячется и за прежним табом не идёт', async () => {
		const mounted = renderPanel('a')

		await mounted.setProps({ panel: 'z' })

		expect(mounted.find('.so-tabs__panel').exists()).toBe(false)

		const [first, second] = mounted.findAll('[role="tab"]')

		// Прежний таб снова активен — панель уже не его
		await second.trigger('click')
		await first.trigger('click')
		await nextTick()

		expect(first.attributes('aria-selected')).toBe('true')
		expect(mounted.find('.so-tabs__panel').exists()).toBe(false)
	})

	it('из значения без таба к активному табу — панель видна и подписана им', async () => {
		const mounted = renderPanel('z')

		expect(mounted.find('.so-tabs__panel').exists()).toBe(false)

		await mounted.setProps({ panel: 'a' })

		const panel = mounted.find('.so-tabs__panel')

		expect(panel.exists()).toBe(true)
		expect(panel.attributes('aria-labelledby')).toBe(
			mounted.findAll('[role="tab"]')[0].attributes('id'),
		)
	})
})

/**
 * Панель — содержимое приложения, и ближайшая коллекция над её содержимым —
 * Tabs. Элемент чужой коллекции в панели (тег-чип, радио) входит только в
 * коллекцию своего типа, а не в табы. Тег раньше ронял сборку — фасаду тега
 * нужен выбор, которого у табов нет, — а радио с тем же набором расширений
 * (активация) молча становилось новым табом.
 */
describe('элемент чужой коллекции в панели', () => {
	it('тег и радио в панели табами не становятся', async () => {
		const engine = createEngineTabs()
		const wrapper = mount(
			defineComponent({
				render: () =>
					h(
						Tabs,
						{ engine },
						{
							default: () => [
								h(TabsItem, { value: 'a', text: 'First', active: true }),
								h(TabsItem, { value: 'b', text: 'Second' }),
							],
							content: () =>
								h(TabsContent, { value: 'a' }, () => [
									h(Tags.Item, { value: 'tag', text: 'Тег' }),
									h(RadioGroup.Item, { value: 'radio' }),
								]),
						},
					),
			}),
			{ attachTo: document.body },
		)

		await nextTick()

		expect(engine.extensions.batch.items.map((item) => item.value)).toEqual(['a', 'b'])
		expect(wrapper.findAll('[role="tab"]')).toHaveLength(2)
		// Свои элементы нарисованы в панели — сами по себе
		expect(wrapper.find('.so-tabs__panel .so-tags-item').text()).toContain('Тег')
		expect(wrapper.find('.so-tabs__panel input[type="radio"]').exists()).toBe(true)

		wrapper.unmount()
	})
})

describe('связка ARIA в разметке', () => {
	it('aria-controls активного таба указывает на id его панели', () => {
		const wrapper = render()

		const tab = wrapper.findAll('[role="tab"]')[0]
		const panel = wrapper.find('.so-tabs__panel')

		expect(tab.attributes('aria-controls')).toBe(panel.attributes('id'))
	})

	it('aria-labelledby панели указывает на id таба', () => {
		const wrapper = render()

		const tab = wrapper.findAll('[role="tab"]')[0]
		const panel = wrapper.find('.so-tabs__panel')

		expect(panel.attributes('aria-labelledby')).toBe(tab.attributes('id'))
	})

	it('панель объявлена как tabpanel', () => {
		expect(render().find('.so-tabs__panel').attributes('role')).toBe('tabpanel')
	})

	/**
	 * Свой `id` таба — его вход: он встаёт на таб вместо `id` от монтирования,
	 * и панель ссылается на него. В `$attrs` он не попадает и мимо набора на
	 * строку таба не едет, поэтому узел с ним один — таб. `id` панели своего
	 * входа не имеет и остаётся формулой.
	 */
	it('свой id таба — на табе, панель ссылается на него и идёт за его сменой', async () => {
		const own = ref<string | undefined>('settings')
		const wrapper = mount(
			defineComponent({
				render: () =>
					h(
						Tabs,
						{},
						{
							default: () => [
								h(TabsItem, {
									value: 'a',
									text: 'First',
									active: true,
									id: own.value,
								}),
								h(TabsItem, { value: 'b', text: 'Second' }),
							],
							content: () => h(TabsContent, { value: 'a' }, () => 'Панель A'),
						},
					),
			}),
			{ attachTo: document.body },
		)
		const tab = () => wrapper.findAll('[role="tab"]')[0]
		const panel = () => wrapper.find('.so-tabs__panel')

		expect(tab().attributes('id')).toBe('settings')
		expect(panel().attributes('aria-labelledby')).toBe('settings')
		expect(document.querySelectorAll('[id="settings"]')).toHaveLength(1)
		expect(wrapper.find('.so-tabs-item').attributes('id')).toBeUndefined()

		own.value = 'general'
		await nextTick()

		expect(tab().attributes('id')).toBe('general')
		expect(panel().attributes('aria-labelledby')).toBe('general')
		expect(tab().attributes('aria-controls')).toBe(panel().attributes('id'))

		wrapper.unmount()
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
		expect(wrapper.find('.so-tabs-item').attributes('aria-selected')).toBeUndefined()
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
