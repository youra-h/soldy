/**
 * Menu во Vue — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро (`core/__tests__/menu.spec.ts`), клавиши, указатель и
 * фокус — плагины (`plugins/__tests__/menu.plugin.spec.ts`); здесь важно, что
 * они сходятся: панель телепортирована и помечена владельцем, роль и связки
 * стоят на своих узлах, пункты из данных и разметкой входят в коллекцию, клик
 * строки действия закрывает меню и сообщает `choose`, флажок отмечается и
 * меню не закрывает. Раскладка и действия браузера —
 * `playground/vue/browser/menu.spec.ts`.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { Button, Menu } from '@soldy-ui/vue'
import type { IMenuItem } from '@soldy-ui/core'
import type { DescriptorSlots, MenuDescriptor } from '@soldy-ui/setup'

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

type TTriggerScope = DescriptorSlots<typeof MenuDescriptor>['trigger']

let wrapper: ReturnType<typeof mount> | null = null

afterEach(() => {
	wrapper?.unmount()
	wrapper = null
	document.body.innerHTML = ''
})

/** Смонтировать разметку в документ и дождаться кадра: корень плагины получают через кадр. */
async function render(content: () => VNode): Promise<ReturnType<typeof mount>> {
	const mounted = mount(defineComponent({ render: content }), { attachTo: document.body })

	wrapper = mounted

	await nextTick()
	await nextFrame()

	return mounted
}

/** Триггер так, как его кладёт потребитель: Button со связкой и видом из scope. */
const trigger = ({ triggerAria, triggerDataset }: TTriggerScope) =>
	h(Button, { text: 'Действия', class: 'so-test-trigger', ...triggerAria, ...triggerDataset })

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

const triggerNode = () => find('.so-test-trigger')
const panel = () => find('.so-menu__panel')
const isOpen = () => panel().style.display !== 'none'
/** Строки пунктов по порядку — узлы с ролью. */
const rows = () => [...panel().querySelectorAll<HTMLElement>('[role^="menuitem"]')]
/** Строка пункта по тексту. */
const rowOf = (text: string): HTMLElement => {
	const row = rows().find((candidate) => candidate.textContent?.trim().startsWith(text))

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Клик мышью по строке. */
async function click(target: HTMLElement): Promise<void> {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

	await nextTick()
}

/** Открыть кликом по триггеру и дождаться кадра модели фокуса. */
async function open(): Promise<void> {
	await click(triggerNode())
	await nextFrame()
}

const ITEMS = [
	{ value: 'edit', text: 'Изменить' },
	{ value: 'remove', text: 'Удалить', variant: 'danger' as const },
]

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(() => h(Menu, { items: ITEMS }, { trigger }))

		const root = find('.so-menu')

		expect(root.localName).toBe('span')
		expect(root.contains(triggerNode())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — меню с именем от кнопки, триггер ссылается на панель', async () => {
		await render(() => h(Menu, { items: ITEMS }, { trigger }))

		const button = triggerNode()

		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		expect(button.getAttribute('aria-haspopup')).toBe('menu')
		expect(button.getAttribute('aria-expanded')).toBe('false')
		expect(button.getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(button.id)
		expect(button.id).not.toBe('')
		// Список — только прокрутка: роли у него нет
		expect(find('.so-menu__list').hasAttribute('role')).toBe(false)
	})

	it('пункты из данных — действия: строка с ролью и вне обхода Tab', async () => {
		await render(() => h(Menu, { items: ITEMS }, { trigger }))

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Изменить', 'Удалить'])
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['menuitem', 'menuitem'])
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
		expect(rows().some((row) => row.hasAttribute('aria-checked'))).toBe(false)
	})

	it('размер и вариант меню — модификаторами панели, свой вариант — у пункта', async () => {
		await render(() => h(Menu, { items: ITEMS, size: 'lg', variant: 'brand' }, { trigger }))

		expect(panel().classList).toContain('so-menu__panel--size-lg')
		expect(panel().classList).toContain('so-menu__panel--variant-brand')

		const [edit, remove] = [...panel().querySelectorAll('.so-menu-item')]

		expect(edit.classList).toContain('so-menu-item--size-lg')
		expect(remove.classList).toContain('so-menu-item--size-lg')
		// Вариант меню пункту не пишется: тема красит его с панели
		expect([...edit.classList].some((cls) => cls.includes('--variant-'))).toBe(false)
		expect(remove.classList).toContain('so-menu-item--variant-danger')
	})

	it('слоты пункта из данных пробрасываются с пунктом в scope', async () => {
		await render(() =>
			h(
				Menu,
				{ items: ITEMS },
				{
					trigger,
					'item-leading': ({ item }: { item: IMenuItem }) =>
						h('i', { class: 'so-test-icon' }, String(item.value)),
					item: ({ text }: { text: string }) => `${text}…`,
					'item-trailing': ({ item }: { item: IMenuItem }) =>
						item.value === 'remove' ? 'Del' : null,
				},
			),
		)

		const [edit, remove] = rows()

		expect(find('.so-menu-item__icon .so-test-icon', edit).textContent).toBe('edit')
		expect(find('.so-button__text', edit).textContent).toBe('Изменить…')
		expect(find('.so-menu-item__shortcut', edit).textContent).toBe('')
		expect(find('.so-menu-item__shortcut', remove).textContent).toBe('Del')
	})

	it('пустые значок и подсказка — без содержимого: тема прячет их по :empty', async () => {
		await render(() => h(Menu, { items: ITEMS }, { trigger }))

		for (const row of rows()) {
			expect(find('.so-menu-item__icon', row).textContent).toBe('')
			expect(find('.so-menu-item__icon', row).children).toHaveLength(0)
			expect(find('.so-menu-item__shortcut', row).children).toHaveLength(0)
		}
	})
})

describe('открытие', () => {
	it('клик по триггеру открывает меню, повторный — закрывает', async () => {
		await render(() => h(Menu, { items: ITEMS }, { trigger }))

		await open()

		expect(isOpen()).toBe(true)
		expect(triggerNode().getAttribute('aria-expanded')).toBe('true')
		expect(triggerNode().dataset.selected).toBe('true')
		expect(find('.so-menu').dataset.open).toBe('true')

		await click(triggerNode())

		expect(isOpen()).toBe(false)
	})

	it('v-model:open — в обе стороны', async () => {
		const open = ref(false)

		await render(() =>
			h(
				Menu,
				{
					items: ITEMS,
					open: open.value,
					'onUpdate:open': (value: boolean) => (open.value = value),
				},
				{ trigger },
			),
		)

		open.value = true
		await nextTick()

		expect(isOpen()).toBe(true)

		await click(triggerNode())

		expect(open.value).toBe(false)
	})
})

describe('нажатие пунктов', () => {
	it('клик строки действия закрывает меню, сообщает choose и возвращает фокус', async () => {
		const chosen: unknown[] = []

		await render(() =>
			h(
				Menu,
				{ items: ITEMS, onChoose: (item: IMenuItem) => chosen.push(item.value) },
				{ trigger },
			),
		)

		await open()
		await click(rowOf('Удалить'))

		expect(chosen).toEqual(['remove'])
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Enter на строке — её клик: пункт нажат один раз', async () => {
		const chosen: unknown[] = []

		await render(() =>
			h(
				Menu,
				{ items: ITEMS, onChoose: (item: IMenuItem) => chosen.push(item.value) },
				{ trigger },
			),
		)

		triggerNode().focus()
		triggerNode().dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
		)
		await nextTick()
		await nextFrame()

		expect(document.activeElement).toBe(rowOf('Изменить'))

		rowOf('Изменить').dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
		)
		await nextTick()

		expect(chosen).toEqual(['edit'])
		expect(isOpen()).toBe(false)
	})

	it('выключенный пункт не нажимается', async () => {
		const chosen: unknown[] = []

		await render(() =>
			h(
				Menu,
				{
					items: [{ value: 'edit', text: 'Изменить', disabled: true }],
					onChoose: (item: IMenuItem) => chosen.push(item.value),
				},
				{ trigger },
			),
		)

		await open()
		await click(rowOf('Изменить'))

		expect(rowOf('Изменить').getAttribute('aria-disabled')).toBe('true')
		expect(chosen).toEqual([])
		expect(isOpen()).toBe(true)
	})

	it('флажок отмечается кликом и меню не закрывает: v-model:selected', async () => {
		const grid = ref(false)
		const chosen: unknown[] = []

		await render(() =>
			h(
				Menu,
				{ onChoose: (item: IMenuItem) => chosen.push(item.value) },
				{
					trigger,
					default: () => [
						h(Menu.CheckboxItem, {
							value: 'grid',
							text: 'Сетка',
							selected: grid.value,
							'onUpdate:selected': (value: boolean) => (grid.value = value),
						}),
						h(Menu.CheckboxItem, { value: 'ruler', text: 'Линейка', selected: true }),
					],
				},
			),
		)

		await open()

		expect(rowOf('Сетка').getAttribute('role')).toBe('menuitemcheckbox')
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')

		await click(rowOf('Сетка'))

		expect(grid.value).toBe(true)
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		// Отметки флажков независимы, меню открыто, choose нет
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')
		expect(isOpen()).toBe(true)
		expect(chosen).toEqual([])

		grid.value = false
		await nextTick()

		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
	})

	it('отметка рисуется только у отмеченного флажка, обёртка — у всех флажков', async () => {
		await render(() =>
			h(
				Menu,
				{},
				{
					trigger,
					default: () => [
						h(Menu.CheckboxItem, { value: 'grid', text: 'Сетка' }),
						h(Menu.CheckboxItem, { value: 'ruler', text: 'Линейка', selected: true }),
						h(Menu.Item, { value: 'edit', text: 'Изменить' }),
					],
				},
			),
		)

		const indicator = (text: string) => rowOf(text).querySelector('.so-menu-item__indicator')

		expect(indicator('Сетка')?.getAttribute('aria-hidden')).toBe('true')
		expect(indicator('Сетка')?.querySelector('svg, .so-icon')).toBeNull()
		expect(indicator('Линейка')?.querySelector('.so-icon')).not.toBeNull()
		expect(indicator('Изменить')).toBeNull()
	})
})

describe('группа и разделитель', () => {
	it('группа — group с именем от подписи, пункты в ней — пункты меню', async () => {
		await render(() =>
			h(
				Menu,
				{},
				{
					trigger,
					default: () => [
						h(Menu.Group, { label: 'Вид' }, () => [
							h(Menu.CheckboxItem, { value: 'grid', text: 'Сетка' }),
						]),
						h(Menu.Separator),
						h(Menu.Group, null, () => [
							h(Menu.Item, { value: 'edit', text: 'Изменить' }),
						]),
					],
				},
			),
		)

		const [labelled, bare] = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]
		const label = find('.so-menu-group__label', labelled)

		expect(labelled.getAttribute('role')).toBe('group')
		expect(label.textContent).toBe('Вид')
		expect(labelled.getAttribute('aria-labelledby')).toBe(label.id)
		expect(label.id).not.toBe('')

		// Без подписи — ни обёртки, ни ссылки
		expect(bare.querySelector('.so-menu-group__label')).toBeNull()
		expect(bare.hasAttribute('aria-labelledby')).toBe(false)

		expect(find('.so-menu-separator').getAttribute('role')).toBe('separator')

		// Навигация идёт сквозь группы: строки в порядке разметки
		triggerNode().focus()
		triggerNode().dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }),
		)
		await nextTick()
		await nextFrame()

		expect(document.activeElement).toBe(rowOf('Изменить'))
	})
})
