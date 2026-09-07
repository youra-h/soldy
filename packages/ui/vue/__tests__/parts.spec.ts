/**
 * Составные компоненты: `<Tabs.Item>` — основная форма записи.
 *
 * Точка решает проблему согласованности имён: `Tabs` + `TabsItem` +
 * `TabsContent` надо держать в согласии вручную, а `Tabs.Item` / `Tabs.Content`
 * согласованы по построению — префиксом служит сам владелец. Плоские имена
 * остаются рабочими: они нужны там, где точки нет (Angular, Web Components).
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import {
	Tabs,
	TabsItem,
	TabsContent,
	ListBox,
	ListBoxItem,
	Collapse,
	CollapseItem,
} from '@soldy/ui-vue'
import Harness from './Parts.test.vue'

describe('точка и плоское имя — один компонент', () => {
	it('Tabs.Item === TabsItem, Tabs.Content === TabsContent', () => {
		expect(Tabs.Item).toBe(TabsItem)
		expect(Tabs.Content).toBe(TabsContent)
	})

	it('ListBox.Item === ListBoxItem', () => {
		expect(ListBox.Item).toBe(ListBoxItem)
	})

	it('Collapse.Item === CollapseItem', () => {
		expect(Collapse.Item).toBe(CollapseItem)
	})
})

describe('точка резолвится в шаблоне SFC', () => {
	const render = (mode: 'dotted' | 'flat' | 'mixed') =>
		mount(Harness, { props: { mode }, attachTo: document.body })

	it('<Tabs.Item> отрисовывает таб', () => {
		const wrapper = render('dotted')

		expect(wrapper.find('.s-tabs-item').exists()).toBe(true)
		expect(wrapper.text()).toContain('First')
	})

	it('<TabsItem> даёт ту же разметку', () => {
		// id связки ARIA строятся от uid и уникальны у каждого инстанса —
		// сравнивать побайтово нельзя, сравниваем структуру
		const strip = (html: string) => html.replace(/s-tab(panel)?-\d+/g, 's-tab-N')

		expect(strip(render('flat').html())).toBe(strip(render('dotted').html()))
	})

	it('точка и плоское имя смешиваются в одном списке', () => {
		expect(render('mixed').findAll('.s-tabs-item')).toHaveLength(2)
	})
})

describe('ограничение точки', () => {
	/**
	 * Рантайм-компилятор ищет «Tabs.Item» как имя в реестре `components` и не
	 * находит: обращение к свойству делает только компилятор SFC, который видит
	 * импорт как биндинг. Тест сторожит это ограничение, чтобы оно не всплыло
	 * у потребителя как молча пустая разметка.
	 */
	it('в строковом template с global-регистрацией точка НЕ работает', () => {
		const wrapper = mount({
			components: { Tabs, TabsItem },
			template: '<Tabs><Tabs.Item value="a" text="First" /></Tabs>',
		})

		expect(wrapper.find('.s-tabs-item').exists()).toBe(false)
	})

	it('плоское имя работает в обоих режимах компиляции', () => {
		const wrapper = mount({
			components: { Tabs, TabsItem },
			template: '<Tabs><TabsItem value="a" text="First" /></Tabs>',
		})

		expect(wrapper.find('.s-tabs-item').exists()).toBe(true)
	})
})
