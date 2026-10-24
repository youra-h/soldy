/**
 * Элементы коллекций составные: корень-обёртка и вложенный `Button` — строка
 * элемента.
 *
 * Наборы ядра стоят на разных элементах: `attrs` — атрибуты корня, `aria` — на
 * строке. Нативного `disabled` на обёртке быть не должно (у `div` такого
 * атрибута нет), а ARIA-половину решает тег строки: у Tabs и Accordion это
 * `<button>` со своим нативным `disabled`, у ListBox и Tags — `div`, у Select —
 * `span`, где `aria-disabled` остаётся единственным способом сообщить
 * состояние.
 *
 * Корень рисуется по `tag` — иначе проп декоративен, и нативный `disabled`
 * из `attrs` попадает на элемент, у которого его нет.
 *
 * Что ядро пишет в какой набор, проверяет `core/__tests__/aria.spec.ts`;
 * здесь — что наборы доехали до своих элементов.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
	Accordion,
	AccordionItem,
	ListBox,
	ListBoxItem,
	Select,
	SelectItem,
	Tabs,
	TabsItem,
	Tags,
	TagsItem,
} from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** `tag="…"` в шаблон элемента — пустая строка оставляет дефолт. */
const tagAttr = (tag: string) => (tag ? ` tag="${tag}"` : '')

/** Коллекции из слотов монтируются строковым шаблоном: точка в нём не работает. */
const renderSlotted = async (components: Record<string, unknown>, template: string) => {
	wrapper = mount({ components, template }, { attachTo: document.body })

	await nextTick()
}

const renderTabs = (tag = '') =>
	renderSlotted(
		{ Tabs, TabsItem },
		`<Tabs><TabsItem value="a" text="A" disabled${tagAttr(tag)} /></Tabs>`,
	)

const renderAccordion = (tag = '') =>
	renderSlotted(
		{ Accordion, AccordionItem },
		`<Accordion><AccordionItem value="a" text="A" disabled${tagAttr(tag)} /></Accordion>`,
	)

const renderListBox = (tag = '') =>
	renderSlotted(
		{ ListBox, ListBoxItem },
		`<ListBox><ListBoxItem value="a" text="A" disabled${tagAttr(tag)} /></ListBox>`,
	)

const renderTags = (tag = '') =>
	renderSlotted(
		{ Tags, TagsItem },
		`<Tags><TagsItem value="a" text="A" disabled${tagAttr(tag)} /></Tags>`,
	)

/** Опции телепортированы в панель, но панель в документе, хоть и закрыта. */
const renderSelect = (tag = '') =>
	renderSlotted(
		{ Select, SelectItem },
		`<Select><SelectItem value="a" text="A" disabled${tagAttr(tag)} /></Select>`,
	)

const root = (selector: string) => document.querySelector(selector)
const line = (selector: string) => document.querySelector(`${selector} .so-button`)

/** Строка — вложенный `<button>`: нативный `disabled` у неё свой, от `TButton`. */
const NATIVE_LINE = [
	['Tabs.Item', '.so-tabs-item', renderTabs, 'BUTTON'],
	['Accordion.Item', '.so-accordion-item', renderAccordion, 'BUTTON'],
] as const

/** Строка с фиксированным тегом без нативного `disabled`: `div` или `span`. */
const ARIA_LINE = [
	['ListBox.Item', '.so-list-box-item', renderListBox, 'DIV'],
	['Tags.Item', '.so-tags-item', renderTags, 'DIV'],
	['Select.Item', '.so-select-item', renderSelect, 'SPAN'],
] as const

const WRAPPER_CASES = [...NATIVE_LINE, ...ARIA_LINE]

describe.each(WRAPPER_CASES)('%s · обёртка', (_name, selector, render) => {
	it('нативного disabled на обёртке нет — у div такого атрибута нет', async () => {
		await render()

		expect(root(selector)?.hasAttribute('disabled')).toBe(false)
	})

	it('состояние для темы стоит на обёртке как data-disabled', async () => {
		await render()

		expect(root(selector)?.getAttribute('data-disabled')).toBe('true')
	})

	it('корень рисуется по tag: у fieldset нативный disabled появляется', async () => {
		await render('fieldset')

		const wrapperEl = root(selector)

		expect(wrapperEl?.tagName).toBe('FIELDSET')
		expect(wrapperEl?.hasAttribute('disabled')).toBe(true)
	})
})

describe.each(NATIVE_LINE)('%s · строка', (_name, selector, render, lineTag) => {
	it('вложенный <button> несёт нативный disabled без ARIA-дубля', async () => {
		await render()

		const lineEl = line(selector)

		expect(lineEl?.tagName).toBe(lineTag)
		expect(lineEl?.hasAttribute('disabled')).toBe(true)
		expect(lineEl?.hasAttribute('aria-disabled')).toBe(false)
	})

	it('тег корня на ARIA строки не влияет', async () => {
		await render('fieldset')

		expect(line(selector)?.hasAttribute('aria-disabled')).toBe(false)
	})
})

describe.each(ARIA_LINE)('%s · строка', (_name, selector, render, lineTag) => {
	it('строка несёт aria-disabled без нативного дубля', async () => {
		await render()

		const lineEl = line(selector)

		expect(lineEl?.tagName).toBe(lineTag)
		expect(lineEl?.getAttribute('aria-disabled')).toBe('true')
		expect(lineEl?.hasAttribute('disabled')).toBe(false)
	})

	it('тег корня строку не переписывает: тег и aria-disabled остаются', async () => {
		await render('fieldset')

		const lineEl = line(selector)

		expect(lineEl?.tagName).toBe(lineTag)
		expect(lineEl?.getAttribute('aria-disabled')).toBe('true')
		expect(lineEl?.hasAttribute('disabled')).toBe(false)
	})
})

/**
 * Строка Select — не только вид, но и сама опция, как строка Tabs — сам таб.
 * Строка — экземпляр, которым владеет опция (`TItemRow`): своих роли и
 * `tabindex` она не пишет, их несёт набор опции. Узел с ролью один — обёртка
 * ничего не объявляет, строка не объявляет себя кнопкой.
 */
describe('Select.Item · строка и есть опция', () => {
	it('role, id и aria-selected опции стоят на строке', async () => {
		await renderSelect()

		const lineEl = line('.so-select-item')

		expect(lineEl?.getAttribute('role')).toBe('option')
		expect(lineEl?.id).toMatch(/-option$/)
		expect(lineEl?.getAttribute('aria-selected')).toBe('false')
	})

	it('обёртка без ARIA: ни роли, ни id, ни второго aria-disabled', async () => {
		await renderSelect()

		const wrapperEl = root('.so-select-item')

		for (const name of ['role', 'id', 'aria-selected', 'aria-disabled']) {
			expect(wrapperEl?.hasAttribute(name)).toBe(false)
		}
	})

	it('строка из обхода выведена и кнопкой себя не объявляет', async () => {
		await renderSelect()

		expect(document.querySelectorAll('.so-select-item [role="button"]')).toHaveLength(0)
		expect(line('.so-select-item')?.getAttribute('tabindex')).toBe('-1')
	})
})

/**
 * Строка ListBox — тоже сама опция: строка — экземпляр, которым владеет
 * элемент (`TItemRow`), и `role="option"` с `tabindex="-1"` на ней — только
 * из набора элемента. Узел с ролью один — обёртка ничего не объявляет.
 */
describe('ListBox.Item · строка и есть опция', () => {
	it('role и aria-selected опции стоят на строке', async () => {
		await renderListBox()

		const lineEl = line('.so-list-box-item')

		expect(lineEl?.getAttribute('role')).toBe('option')
		expect(lineEl?.getAttribute('aria-selected')).toBe('false')
	})

	it('обёртка без ARIA: ни роли, ни aria-selected, ни второго aria-disabled', async () => {
		await renderListBox()

		const wrapperEl = root('.so-list-box-item')

		for (const name of ['role', 'aria-selected', 'aria-disabled']) {
			expect(wrapperEl?.hasAttribute(name)).toBe(false)
		}
	})

	it('строка из обхода выведена и кнопкой себя не объявляет', async () => {
		await renderListBox()

		expect(document.querySelectorAll('.so-list-box-item [role="button"]')).toHaveLength(0)
		expect(line('.so-list-box-item')?.getAttribute('tabindex')).toBe('-1')
	})
})

/**
 * Строка — кнопка над экземпляром элемента (`row`, `TItemRow`): вид, размер,
 * вариант и выключенность ей пишет элемент, а не шаблон пропсами рядом с
 * `ctrl`. Свойства владельца доходят до строки и на смене: владелец пишет их
 * элементу, элемент — строке.
 */
describe('строка — над экземпляром элемента', () => {
	const has = (node: Element | null, cls: string) => node?.classList.contains(cls) ?? false

	it('ListBox: вид и размер списка — на строке, и на смене тоже', async () => {
		wrapper = mount(
			{
				components: { ListBox, ListBoxItem },
				props: { view: String, size: String },
				template: `<ListBox :view="view" :size="size"><ListBoxItem value="a" text="A" /></ListBox>`,
			},
			{ props: { view: 'ghost', size: 'sm' }, attachTo: document.body },
		)
		await nextTick()

		const row = line('.so-list-box-item')

		expect(has(row, 'so-button--view-ghost')).toBe(true)
		expect(has(row, 'so-button--size-sm')).toBe(true)

		await wrapper.setProps({ view: 'solid', size: 'lg' })

		expect(line('.so-list-box-item')).toBe(row)
		expect(has(row, 'so-button--view-solid')).toBe(true)
		expect(has(row, 'so-button--view-ghost')).toBe(false)
		expect(has(row, 'so-button--size-lg')).toBe(true)
		// Своих роли и остановки у строки нет — на ней набор элемента
		expect(row?.getAttribute('role')).toBe('option')
		expect(row?.getAttribute('tabindex')).toBe('-1')
	})

	it('Select: размер и вариант поля — на строке опции, и на смене тоже', async () => {
		wrapper = mount(
			{
				components: { Select, SelectItem },
				props: { size: String, variant: String },
				template: `<Select :size="size" :variant="variant"><SelectItem value="a" text="A" /></Select>`,
			},
			{ props: { size: 'sm', variant: 'brand' }, attachTo: document.body },
		)
		await nextTick()

		const row = line('.so-select-item')

		expect(has(row, 'so-button--size-sm')).toBe(true)
		expect(has(row, 'so-button--variant-brand')).toBe(true)

		await wrapper.setProps({ size: 'lg', variant: 'danger' })

		expect(has(row, 'so-button--size-lg')).toBe(true)
		expect(has(row, 'so-button--variant-danger')).toBe(true)
		expect(row?.getAttribute('role')).toBe('option')
		expect(row?.getAttribute('tabindex')).toBe('-1')
	})
})
