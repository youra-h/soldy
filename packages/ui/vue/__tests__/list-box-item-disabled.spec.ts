/**
 * «Выключено» элемента коллекции в разметке: своё — вход, итог — то, что
 * рисуется.
 *
 * Геттер `disabled` отдаёт итог — своё **или** владельца, — а сеттер пишет
 * своё. Пока обмен сверял значение из разметки с геттером, своё `true`,
 * пришедшее в выключенном списке, совпадало с итогом и в ядро не писалось — и
 * после включения списка элемент оживал, хотя в разметке выключен. Теперь то
 * же ли это значение, решает сеттер, сверкой со своим (`TLine.write`).
 *
 * Правило ядра на шести коллекциях стережёт
 * `core/__tests__/collection-disabled-inherit.spec.ts`; здесь — что запись из
 * разметки доходит до ядра, а шаблоны выключают строку по итогу.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ListBox, ListBoxItem, Tabs, TabsItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Список и элемент, выключаемые каждый своим пропом. */
const ListBoxHarness = {
	components: { ListBox, ListBoxItem },
	props: {
		owner: { type: Boolean, default: false },
		item: { type: Boolean, default: false },
	},
	template: `
		<ListBox :disabled="owner">
			<ListBoxItem value="a" text="A" :disabled="item" />
		</ListBox>
	`,
}

/** Корень элемента: на нём `data-disabled` для темы. */
const itemRoot = (): Element | null => document.querySelector('.s-list-box-item')

/** Строка элемента — вложенный `Button`: на ней ARIA элемента. */
const itemRow = (): Element | null => document.querySelector('.s-list-box-item .s-button')

describe('ListBox.Item: своё disabled из разметки в выключенном списке', () => {
	/** Воспроизведение из задачи. */
	it('выключили элемент, пока выключен список, — после включения списка он выключен', async () => {
		const mounted = mount(ListBoxHarness, {
			props: { owner: true, item: false },
			attachTo: document.body,
		})

		wrapper = mounted
		await nextTick()

		expect(itemRoot()?.getAttribute('data-disabled')).toBe('true')

		await mounted.setProps({ item: true })
		await mounted.setProps({ owner: false })
		await nextTick()

		expect(itemRoot()?.getAttribute('data-disabled')).toBe('true')
		expect(itemRow()?.getAttribute('aria-disabled')).toBe('true')
	})

	it('своё false: список выключает элемент и включает его обратно', async () => {
		const mounted = mount(ListBoxHarness, {
			props: { owner: false, item: false },
			attachTo: document.body,
		})

		wrapper = mounted
		await nextTick()

		expect(itemRoot()?.getAttribute('data-disabled')).toBe('false')
		expect(itemRow()?.hasAttribute('aria-disabled')).toBe(false)

		await mounted.setProps({ owner: true })
		await nextTick()

		expect(itemRoot()?.getAttribute('data-disabled')).toBe('true')
		expect(itemRow()?.getAttribute('aria-disabled')).toBe('true')

		await mounted.setProps({ owner: false })
		await nextTick()

		expect(itemRoot()?.getAttribute('data-disabled')).toBe('false')
		expect(itemRow()?.hasAttribute('aria-disabled')).toBe(false)
	})
})

describe('Tabs.Item: строку выключает итог, а не своё', () => {
	/**
	 * Своё `disabled` таба — `false`, выключен набор. Шаблон отдаёт строке
	 * итог: рисуй он своё, кнопка таба в выключенном наборе осталась бы
	 * нажимаемой.
	 */
	it('кнопка строки в выключенном Tabs нативно disabled', async () => {
		wrapper = mount(
			{
				components: { Tabs, TabsItem },
				template: `<Tabs disabled><TabsItem value="a" text="A" /></Tabs>`,
			},
			{ attachTo: document.body },
		)

		await nextTick()

		const row = document.querySelector('.s-tabs-item > button')

		expect(row).not.toBeNull()
		expect(row?.hasAttribute('disabled')).toBe(true)
	})
})
