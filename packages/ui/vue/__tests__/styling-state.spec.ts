/**
 * Состояние для CSS отдаётся через `data-*`, а не через `aria-*`.
 *
 * Повод для теста — реальная регрессия. `aria-selected` перенесли с обёртки на
 * элемент с ролью (правильно с точки зрения доступности), а тема раскрывала
 * панель Accordion и красила активный таб селекторами
 * `.s-accordion-item[aria-selected='true']` / `.s-tabs-item[data-selected]`.
 * ARIA починили — вид сломался, и ни один тест этого не заметил, потому что
 * все они проверяли ARIA.
 *
 * Отсюда правило: ARIA — контракт со скринридером, `data-*` — контракт с
 * темой. Пока они не разделены, доступность нельзя править, не ломая вид.
 * Тест держит границу с двух сторон: состояние на обёртке есть, а ARIA на
 * ней нет.
 *
 * Оба набора теперь приходят из ядра готовыми (`aria` и `dataset`), и шаблон
 * не вычисляет состояние сам. Поэтому эти проверки заодно стерегут проводку:
 * убери запись в ядре — и атрибут исчезнет из разметки.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AccordionHarness from './Accordion.test.vue'
import TabsHarness from './TabsContent.test.vue'
import SelectHarness from './Select.test.vue'

describe('Accordion: обёртка несёт data-selected для темы', () => {
	it('раскрытый элемент помечен data-selected="true", свёрнутый — "false"', () => {
		const items = mount(AccordionHarness, { attachTo: document.body }).findAll(
			'.s-accordion-item',
		)

		expect(items[0].attributes('data-selected')).toBe('true')
		expect(items[1].attributes('data-selected')).toBe('false')
	})

	it('следует за раскрытием по клику', async () => {
		const wrapper = mount(AccordionHarness, { attachTo: document.body })

		await wrapper.findAll('.s-accordion-item__header')[1].trigger('click')
		await nextTick()

		expect(wrapper.findAll('.s-accordion-item')[1].attributes('data-selected')).toBe('true')
	})

	it('на обёртке нет aria-selected — у неё нет роли', () => {
		const item = mount(AccordionHarness, { attachTo: document.body }).find('.s-accordion-item')

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

describe('Select: корень несёт data-open для темы', () => {
	let wrapper: ReturnType<typeof mount> | null = null

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		document.body.innerHTML = ''
	})

	it('следует за открытием панели', async () => {
		wrapper = mount(SelectHarness, { attachTo: document.body })

		const root = () => wrapper!.find('.s-select')

		expect(root().attributes('data-open')).toBe('false')

		await root().trigger('click')
		await nextTick()

		expect(root().attributes('data-open')).toBe('true')
	})

	/**
	 * Состояние панели объявлено скринридеру через `aria-expanded` на поле —
	 * там, где у него есть роль `combobox`. На корне ARIA быть не должно: он
	 * несёт только контракт с темой.
	 */
	it('на корне нет aria-expanded — он на поле с role="combobox"', async () => {
		wrapper = mount(SelectHarness, { attachTo: document.body })

		expect(wrapper.find('.s-select').attributes('aria-expanded')).toBeUndefined()
		expect(wrapper.find('[role="combobox"]').attributes('aria-expanded')).toBe('false')
	})
})
