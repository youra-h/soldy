/**
 * Состояние для CSS отдаётся через `data-*`, а не через `aria-*`.
 *
 * Повод для теста — реальная регрессия. `aria-selected` перенесли с обёртки на
 * элемент с ролью (правильно с точки зрения доступности), а тема раскрывала
 * панель Collapse и красила активный таб селекторами
 * `.s-collapse-item[aria-selected='true']` / `.s-tabs-item[data-selected]`.
 * ARIA починили — вид сломался, и ни один тест этого не заметил, потому что
 * все они проверяли ARIA.
 *
 * Отсюда правило: ARIA — контракт со скринридером, `data-*` — контракт с
 * темой. Пока они не разделены, доступность нельзя править, не ломая вид.
 * Тест держит границу с двух сторон: состояние на обёртке есть, а ARIA на
 * ней нет.
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import CollapseHarness from './Collapse.test.vue'
import TabsHarness from './TabsContent.test.vue'

describe('Collapse: обёртка несёт data-selected для темы', () => {
	it('раскрытый элемент помечен data-selected="true", свёрнутый — "false"', () => {
		const items = mount(CollapseHarness, { attachTo: document.body }).findAll(
			'.s-collapse-item',
		)

		expect(items[0].attributes('data-selected')).toBe('true')
		expect(items[1].attributes('data-selected')).toBe('false')
	})

	it('следует за раскрытием по клику', async () => {
		const wrapper = mount(CollapseHarness, { attachTo: document.body })

		await wrapper.findAll('.s-collapse-item__header')[1].trigger('click')
		await nextTick()

		expect(wrapper.findAll('.s-collapse-item')[1].attributes('data-selected')).toBe('true')
	})

	it('на обёртке нет aria-selected — у неё нет роли', () => {
		const item = mount(CollapseHarness, { attachTo: document.body }).find('.s-collapse-item')

		expect(item.attributes('aria-selected')).toBeUndefined()
	})
})

describe('Tabs: обёртка несёт data-selected для темы', () => {
	it('активный таб помечен data-selected="true"', () => {
		const items = mount(TabsHarness, { attachTo: document.body }).findAll('.s-tabs-item')

		expect(items.length).toBeGreaterThan(1)
		expect(items.filter((i) => i.attributes('data-selected') === 'true')).toHaveLength(1)
	})

	it('на обёртке нет aria-selected — он на элементе с role="tab"', () => {
		const wrapper = mount(TabsHarness, { attachTo: document.body })

		expect(wrapper.find('.s-tabs-item').attributes('aria-selected')).toBeUndefined()
		expect(wrapper.find('[role="tab"]').attributes('aria-selected')).toBeDefined()
	})
})
