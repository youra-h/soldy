/**
 * ListBox и Tabs делят атрибуты потребителя, как поля и элементы коллекций:
 * класс и стиль — корню, остальное — узлу списка с ролью (`listbox`,
 * `tablist`), поверх его `aria` (`inheritAttrs: false` и `useSplitAttrs`).
 *
 * Корень у обоих — рамка без роли: у ListBox рядом со списком стоят шапка и
 * подвал, у Tabs — панели. На корне `aria-label` потребителя называл бы узел
 * без роли (axe — `aria-prohibited-attr`), а у списка имени не было бы;
 * `tabindex` потребителя не снимал бы список с остановок Tab.
 *
 * Где какой набор ядра, проверяют `list-box-tabindex.spec.ts` и спеки Tabs;
 * здесь — куда уходят атрибуты потребителя.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { ListBox, ListBoxItem, Tabs, TabsItem } from '@soldy-ui/vue'

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
})

/** Узел по селектору; нет его — тест падает здесь, а не на чтении атрибута. */
const find = (selector: string): HTMLElement => {
	const element = document.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: узла нет`)

	return element
}

/** Отрисовать список с атрибутами потребителя — как их пишет шаблон. */
type TDraw = (attrs: Record<string, unknown>) => void

/**
 * Список, как его рисовать, класс его корня и узел списка — ребёнок корня с
 * ролью, которому уходят атрибуты потребителя.
 */
const LISTS: ReadonlyArray<readonly [string, TDraw, string, string]> = [
	[
		'ListBox',
		(attrs) => {
			wrapper = mount(ListBox, {
				attrs,
				slots: { default: () => [h(ListBoxItem, { value: 'a', text: 'A' })] },
				attachTo: document.body,
			})
		},
		'.so-list-box',
		'.so-list-box > [role="listbox"]',
	],
	[
		'Tabs',
		(attrs) => {
			wrapper = mount(Tabs, {
				attrs,
				slots: { default: () => [h(TabsItem, { value: 'a', text: 'A', active: true })] },
				attachTo: document.body,
			})
		},
		'.so-tabs',
		'.so-tabs > [role="tablist"]',
	],
]

describe.each(LISTS)('%s: атрибуты потребителя', (_name, draw, root, list) => {
	it('aria-label, id и data-* — на узле списка, а не на корне', () => {
		draw({ 'aria-label': 'Своё', id: 'mine', 'data-probe': '1' })

		const node = find(list)

		expect(node.getAttribute('aria-label')).toBe('Своё')
		expect(node.id).toBe('mine')
		expect(node.dataset['probe']).toBe('1')
		expect(
			['aria-label', 'id', 'data-probe'].filter((name) => find(root).hasAttribute(name)),
		).toEqual([])
	})

	/** Имя пишет плагин доступного имени в `aria`, а `aria-label` снаружи — атрибут потребителя. */
	it('aria-label потребителя — поверх aria_label', () => {
		draw({ aria_label: 'Ядро', 'aria-label': 'Своё' })

		expect(find(list).getAttribute('aria-label')).toBe('Своё')
	})

	it('класс и стиль — корню, а не узлу списка', () => {
		draw({ class: 'mine', style: 'color: red' })

		const node = find(list)

		expect(find(root).classList.contains('mine')).toBe(true)
		expect(find(root).style.color).toBe('red')
		expect(node.classList.contains('mine')).toBe(false)
		expect(node.style.color).toBe('')
	})

	/** `dir` ядро пишет в `attrs` по `direction`, на корень; `dir` снаружи — узлу списка. */
	it('dir ядра — на корне, dir потребителя — на узле списка', () => {
		draw({ direction: 'rtl', dir: 'ltr' })

		expect(find(root).getAttribute('dir')).toBe('rtl')
		expect(find(list).getAttribute('dir')).toBe('ltr')
	})

	it('обработчик потребителя — на узле списка', () => {
		const targets: (EventTarget | null)[] = []

		draw({
			onClick: (event: MouseEvent) => {
				targets.push(event.currentTarget)
			},
		})

		const node = find(list)

		node.click()

		expect(targets).toHaveLength(1)
		expect(targets[0]).toBe(node)
	})

	it('смена атрибута — на узле списка, корень тот же', async () => {
		draw({ title: 'a' })

		const node = find(root)

		await wrapper?.setProps({ title: 'b' })

		expect(find(list).getAttribute('title')).toBe('b')
		expect(find(root)).toBe(node)
		expect(node.hasAttribute('title')).toBe(false)
	})
})

describe('ListBox: остановка Tab', () => {
	it('tabindex="-1" потребителя снимает список с остановок Tab', () => {
		wrapper = mount(ListBox, {
			attrs: { tabindex: '-1' },
			slots: { default: () => [h(ListBoxItem, { value: 'a', text: 'A' })] },
			attachTo: document.body,
		})

		expect(find('[role="listbox"]').getAttribute('tabindex')).toBe('-1')
		expect(find('.so-list-box').hasAttribute('tabindex')).toBe(false)
	})
})
