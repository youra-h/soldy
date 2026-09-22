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
import { ListBox, Tabs, TabsItem } from '@soldy-ui/vue'
import AccordionHarness from './Accordion.test.vue'
import TabsHarness from './TabsContent.test.vue'
import SelectHarness from './Select.test.vue'

/** `TElementPlugin` отдаёт узел через `requestAnimationFrame` — ждём кадр. */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

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

/**
 * Строку таба рисует вложенный Button, и тема исключает выключенный таб из
 * hover селектором по его `data-disabled`: нативный атрибут есть не у каждого
 * тега и переехал бы вместе с ним. Значит атрибут обязан доехать до Button, а
 * не остаться на обёртке.
 */
describe('Tabs: строка таба несёт data-disabled для темы', () => {
	it('выключенный таб помечен "true", включённый — "false"', () => {
		const wrapper = mount(
			{
				components: { Tabs, TabsItem },
				template: `
					<Tabs>
						<TabsItem value="a" text="First" active />
						<TabsItem value="b" text="Second" disabled />
					</Tabs>
				`,
			},
			{ attachTo: document.body },
		)

		// Селектор темы — тот же: строка таба это прямой потомок обёртки
		const rows = wrapper.findAll('.s-tabs-item > *')

		expect(rows.map((row) => row.attributes('data-disabled'))).toEqual(['false', 'true'])
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
		const select = mount(SelectHarness, { attachTo: document.body })

		wrapper = select

		const root = () => select.find('.s-select')

		expect(root().attributes('data-open')).toBe('false')

		await nextFrame()
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

/**
 * Disabled тема читает из `data-disabled` — одного на любом теге: нативный
 * `disabled` и `aria-disabled` решает тег элемента, и они переезжают вместе с
 * ним. Корень ListBox — сам фокусируемый виджет, поэтому `aria-disabled` на
 * нём тоже стоит, но приходит набором ядра, а не вычисляется шаблоном.
 */
describe('ListBox: корень несёт data-disabled для темы', () => {
	it('disabled: data-disabled="true" рядом с aria-disabled из набора', () => {
		const root = mount(ListBox, { props: { disabled: true } })

		expect(root.attributes('data-disabled')).toBe('true')
		expect(root.attributes('aria-disabled')).toBe('true')
	})

	it('без disabled: data-disabled="false", aria-disabled нет вовсе', async () => {
		const root = mount(ListBox)

		expect(root.attributes('data-disabled')).toBe('false')
		expect(root.attributes('aria-disabled')).toBeUndefined()

		await root.setProps({ disabled: true })

		expect(root.attributes('data-disabled')).toBe('true')
		expect(root.attributes('aria-disabled')).toBe('true')
	})
})

describe('Select: опция несёт data-disabled для темы', () => {
	let wrapper: ReturnType<typeof mount> | null = null

	afterEach(() => {
		wrapper?.unmount()
		wrapper = null
		document.body.innerHTML = ''
	})

	/**
	 * Обёртку опции красит `_select.scss`, кнопку внутри — общий
	 * `button-state-bg`: атрибут обязан доехать до обоих.
	 */
	it('корень опции и её .s-button помечены data-disabled', async () => {
		wrapper = mount(SelectHarness, { attachTo: document.body })

		await nextFrame()
		await wrapper.find('.s-select').trigger('click')
		await nextTick()

		const options = [...document.querySelectorAll('.s-select-item')]

		// В обёртке disabled объявлена третья опция
		expect(options.map((option) => option.getAttribute('data-disabled'))).toEqual([
			'false',
			'false',
			'true',
		])
		expect(options[2].querySelector('.s-button')?.getAttribute('data-disabled')).toBe('true')
	})
})
