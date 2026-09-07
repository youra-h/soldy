/**
 * Связка «заголовок ↔ панель» у Collapse.
 *
 * Отдельного компонента `Collapse.Content` нет: панель лежит внутри элемента и
 * отдельно от него не существует, поэтому осталась слотом. Но ARIA-связка ей
 * нужна такая же, как у Tabs, и считает её item-адаптер расширения `content`.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Collapse, CollapseItem } from '@soldy/ui-vue'
import Harness from './Collapse.test.vue'

const render = () => mount(Harness, { attachTo: document.body })

describe('составной компонент', () => {
	it('Collapse.Item === CollapseItem', () => {
		expect(Collapse.Item).toBe(CollapseItem)
	})

	it('части у Collapse только одна: панель — слот, а не компонент', () => {
		// У Tabs есть Content, у Collapse его нет намеренно
		expect('Content' in Collapse).toBe(false)
	})
})

describe('связка ARIA заголовок ↔ панель', () => {
	it('aria-controls заголовка указывает на id панели, aria-labelledby — обратно', () => {
		const wrapper = render()
		const header = wrapper.findAll('.s-collapse-item__header')[0]
		const content = wrapper.findAll('.s-collapse-item__content')[0]

		expect(header.attributes('aria-controls')).toBe(content.attributes('id'))
		expect(content.attributes('aria-labelledby')).toBe(header.attributes('id'))
	})

	it('панель объявлена как region', () => {
		expect(render().find('.s-collapse-item__content').attributes('role')).toBe('region')
	})

	it('id уникальны между элементами', () => {
		const contents = render().findAll('.s-collapse-item__content')

		expect(contents[0].attributes('id')).not.toBe(contents[1].attributes('id'))
	})
})

describe('aria-expanded', () => {
	it('отражает раскрытость и стоит на заголовке, а не на обёртке', () => {
		const wrapper = render()
		const headers = wrapper.findAll('.s-collapse-item__header')

		expect(headers[0].attributes('aria-expanded')).toBe('true')
		expect(headers[1].attributes('aria-expanded')).toBe('false')

		// Раньше на обёртке висел aria-selected без роли — для скринридера пусто
		expect(wrapper.find('.s-collapse-item').attributes('aria-selected')).toBeUndefined()
	})

	it('следует за раскрытием по клику', async () => {
		const wrapper = render()

		await wrapper.findAll('.s-collapse-item__header')[1].trigger('click')
		await nextTick()

		expect(wrapper.findAll('.s-collapse-item__header')[1].attributes('aria-expanded')).toBe(
			'true',
		)
	})
})
