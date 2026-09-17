/**
 * Клавиатура Tabs в разметке — паттерн APG Tabs целиком.
 *
 * Ядро пишет атрибуты в наборы, `TTabsKeyboardPlugin` ловит клавиши на корне;
 * по отдельности это проверяют `core/__tests__/tabs.spec.ts` и
 * `plugins/__tests__/tabs-keyboard.plugin.spec.ts`. Здесь — что наборы доехали
 * до своих элементов и плагин ходит по настоящей разметке: фокус уходит на
 * строку с `role="tab"`, а не на обёртку.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Tabs, TabsItem } from '@soldy/ui-vue'

/**
 * Слушатель клавиш плагин вешает по `ready` узла, а `TElementPlugin` отдаёт
 * его через `requestAnimationFrame`, — ждём кадр, а не `nextTick`.
 */
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Табы из слота — строковым шаблоном: точка в нём не работает, берём плоские имена. */
const render = async (template: string) => {
	wrapper = mount({ components: { Tabs, TabsItem }, template }, { attachTo: document.body })

	await nextTick()
	await nextFrame()
}

const ABC = `
	<TabsItem value="a" text="A" />
	<TabsItem value="b" text="B" active />
	<TabsItem value="c" text="C" />
`

const tabs = () => [...document.querySelectorAll('[role="tab"]')]

/** Строка таба по тексту; нет её — тест падает здесь. */
const tab = (text: string): HTMLElement => {
	const found = tabs().find((candidate) => candidate.textContent?.trim() === text)

	if (!(found instanceof HTMLElement)) throw new Error(`таба «${text}» нет`)

	return found
}

const press = (target: Element, key: string) =>
	target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

describe('одна остановка Tab на весь список', () => {
	it('tabindex="0" ровно у одного таба — у активного', async () => {
		await render(`<Tabs>${ABC}</Tabs>`)

		const stops = document.querySelectorAll('[role="tab"][tabindex="0"]')

		expect(stops).toHaveLength(1)
		expect(stops[0]).toBe(tab('B'))
		expect(tab('A').getAttribute('tabindex')).toBe('-1')
		expect(tab('C').getAttribute('tabindex')).toBe('-1')
	})

	it('кнопка закрытия — не остановка Tab', async () => {
		await render(`<Tabs closable>${ABC}</Tabs>`)

		const closes = [...document.querySelectorAll('.s-tabs-item__close')]

		expect(closes).toHaveLength(3)
		expect(closes.every((close) => close.getAttribute('tabindex') === '-1')).toBe(true)
	})
})

describe('список табов', () => {
	it('tablist объявляет ориентацию и имя из aria_label', async () => {
		await render(`<Tabs orientation="vertical" aria_label="Разделы">${ABC}</Tabs>`)

		const list = document.querySelector('.s-tabs__list')

		expect(list?.getAttribute('role')).toBe('tablist')
		expect(list?.getAttribute('aria-orientation')).toBe('vertical')
		expect(list?.getAttribute('aria-label')).toBe('Разделы')
	})

	it('корень ARIA списка не получает — рядом со списком лежат панели', async () => {
		await render(`<Tabs aria_label="Разделы">${ABC}</Tabs>`)

		const root = document.querySelector('.s-tabs')

		expect(root?.hasAttribute('role')).toBe(false)
		expect(root?.hasAttribute('aria-label')).toBe(false)
	})
})

describe('стрелки', () => {
	it('→ переносит фокус на строку следующего таба и активирует его', async () => {
		await render(`<Tabs>${ABC}</Tabs>`)

		tab('B').focus()
		press(tab('B'), 'ArrowRight')
		await nextTick()

		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
		expect(tab('B').getAttribute('aria-selected')).toBe('false')
		expect(tab('C').getAttribute('tabindex')).toBe('0')
		expect(tab('B').getAttribute('tabindex')).toBe('-1')
	})
})

describe('Delete', () => {
	it('закрывает таб, фокус остаётся в списке — на соседе', async () => {
		wrapper = mount(Tabs, {
			props: {
				closable: true,
				items: [
					{ value: 'a', text: 'A' },
					{ value: 'b', text: 'B', _: { active: true } },
					{ value: 'c', text: 'C' },
				],
			},
			attachTo: document.body,
		})

		await nextTick()
		await nextFrame()

		tab('B').focus()
		press(tab('B'), 'Delete')
		await nextTick()

		expect(tabs().map((candidate) => candidate.textContent?.trim())).toEqual(['A', 'C'])
		expect(document.activeElement).toBe(tab('C'))
		expect(tab('C').getAttribute('aria-selected')).toBe('true')
	})
})
