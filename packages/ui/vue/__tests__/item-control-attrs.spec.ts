/**
 * Элементы коллекций составные: корень-обёртка и вложенный `Button` — строка
 * элемента.
 *
 * Наборы ядра стоят на разных элементах: `attrs` — атрибуты корня, `aria` — на
 * строке. Нативного `disabled` на обёртке быть не должно (у `div` такого
 * атрибута нет), а ARIA-половину решает тег строки: у Tabs и Accordion это
 * `<button>` со своим нативным `disabled`, у ListBox и Tags — `div`, где
 * `aria-disabled` остаётся единственным способом сообщить состояние.
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
	Tabs,
	TabsItem,
	Tags,
	TagsItem,
} from '@soldy/ui-vue'

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

const root = (selector: string) => document.querySelector(selector)
const line = (selector: string) => document.querySelector(`${selector} .s-button`)

/** Строка — вложенный `<button>`: нативный `disabled` у неё свой, от `TButton`. */
const NATIVE_LINE = [
	['Tabs.Item', '.s-tabs-item', renderTabs],
	['Accordion.Item', '.s-accordion-item', renderAccordion],
] as const

/** Строка — `div` с фиксированным тегом: нативного `disabled` у неё нет. */
const ARIA_LINE = [
	['ListBox.Item', '.s-list-box-item', renderListBox],
	['Tags.Item', '.s-tags-item', renderTags],
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

describe.each(NATIVE_LINE)('%s · строка', (_name, selector, render) => {
	it('вложенный <button> несёт нативный disabled без ARIA-дубля', async () => {
		await render()

		const lineEl = line(selector)

		expect(lineEl?.tagName).toBe('BUTTON')
		expect(lineEl?.hasAttribute('disabled')).toBe(true)
		expect(lineEl?.hasAttribute('aria-disabled')).toBe(false)
	})

	it('тег корня на ARIA строки не влияет', async () => {
		await render('fieldset')

		expect(line(selector)?.hasAttribute('aria-disabled')).toBe(false)
	})
})

describe.each(ARIA_LINE)('%s · строка', (_name, selector, render) => {
	it('строка-div несёт aria-disabled без нативного дубля', async () => {
		await render()

		const lineEl = line(selector)

		expect(lineEl?.tagName).toBe('DIV')
		expect(lineEl?.getAttribute('aria-disabled')).toBe('true')
		expect(lineEl?.hasAttribute('disabled')).toBe(false)
	})

	it('тег корня строку не переписывает: она остаётся div с aria-disabled', async () => {
		await render('fieldset')

		const lineEl = line(selector)

		expect(lineEl?.tagName).toBe('DIV')
		expect(lineEl?.getAttribute('aria-disabled')).toBe('true')
		expect(lineEl?.hasAttribute('disabled')).toBe(false)
	})
})
