/**
 * Кнопка закрытия таба — сосед строки, а не её потомок.
 *
 * Строка таба — `<button role="tab">`. Интерактивный потомок у кнопки HTML
 * запрещает, потомки `role="tab"` для скринридера презентационны, а имя таба
 * считается из содержимого. Пока крестик лежал внутри строки, скринридер не
 * видел его кнопкой, а подпись приклеивал к названию: вместо «Настройки»
 * звучало «Настройки Close Настройки».
 *
 * Что вид закрываемого таба остался прежним, проверяет браузерный прогон
 * (`playground/vue/browser/tabs-close.spec.ts`): в jsdom раскладки нет.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { Tabs, TabsItem } from '@soldy/ui-vue'

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
}

const CLOSABLE = `
	<Tabs closable>
		<TabsItem value="settings" text="Настройки" active />
		<TabsItem value="mail" text="Почта" />
	</Tabs>
`

const tabs = () => [...document.querySelectorAll('[role="tab"]')]

/** Элемент таба по тексту строки; нет его — тест падает здесь. */
const item = (text: string): Element => {
	const found = [...document.querySelectorAll('.s-tabs-item')].find(
		(candidate) => candidate.querySelector('[role="tab"]')?.textContent?.trim() === text,
	)

	if (!found) throw new Error(`таба «${text}» нет`)

	return found
}

const closeOf = (text: string): HTMLElement => {
	const close = item(text).querySelector('.s-tabs-item__close')

	if (!(close instanceof HTMLElement)) throw new Error(`у таба «${text}» нет кнопки закрытия`)

	return close
}

describe('разметка', () => {
	it('у таба нет интерактивного потомка', async () => {
		await render(CLOSABLE)

		expect(tabs()).toHaveLength(2)

		for (const tab of tabs()) {
			expect(
				tab.querySelector('button, a[href], input, select, textarea, [tabindex]'),
			).toBeNull()
		}
	})

	it('кнопка закрытия стоит в элементе таба сразу после строки', async () => {
		await render(CLOSABLE)

		const [row, close, ...rest] = [...item('Настройки').children]

		expect(row.getAttribute('role')).toBe('tab')
		expect(close.tagName).toBe('BUTTON')
		expect(close.classList.contains('s-tabs-item__close')).toBe(true)
		expect(rest).toHaveLength(0)
	})

	it('подпись крестика в содержимое таба не входит', async () => {
		await render(CLOSABLE)

		const tab = item('Настройки').querySelector('[role="tab"]')

		expect(tab?.textContent?.trim()).toBe('Настройки')
		expect(tab?.querySelector('[aria-label]')).toBeNull()
		expect(closeOf('Настройки').getAttribute('aria-label')).toBe('Close Настройки')
	})

	it('без closable кнопки нет, в элементе одна строка', async () => {
		await render(`<Tabs><TabsItem value="a" text="A" active /></Tabs>`)

		expect(document.querySelector('.s-tabs-item__close')).toBeNull()
		expect(item('A').children).toHaveLength(1)
	})
})

describe('кнопка ведёт себя как раньше', () => {
	it('клик закрывает таб и не активирует его', async () => {
		wrapper = mount(Tabs, {
			props: {
				closable: true,
				items: [
					{ value: 'a', text: 'A', _: { active: true } },
					{ value: 'b', text: 'B' },
					{ value: 'c', text: 'C' },
				],
			},
			attachTo: document.body,
		})

		await nextTick()

		closeOf('B').click()
		await nextTick()

		// Если бы клик сначала активировал «B», закрытие активного таба отдало
		// бы активность соседу — «C»
		expect(tabs().map((tab) => tab.textContent?.trim())).toEqual(['A', 'C'])
		expect(item('A').querySelector('[role="tab"]')?.getAttribute('aria-selected')).toBe('true')
	})

	it('у выключенного таба выключена и кнопка — строка её больше не накрывает', async () => {
		await render(`
			<Tabs closable>
				<TabsItem value="a" text="A" active />
				<TabsItem value="b" text="B" disabled />
			</Tabs>
		`)

		expect(closeOf('B').hasAttribute('disabled')).toBe(true)
		expect(closeOf('A').hasAttribute('disabled')).toBe(false)
	})

	it('размер кнопки — размер таба: от него считается кегль иконки', async () => {
		await render(`<Tabs closable size="lg"><TabsItem value="a" text="A" active /></Tabs>`)

		expect(closeOf('A').classList.contains('s-button--size-lg')).toBe(true)
	})
})
