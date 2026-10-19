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
import { createEngineMenu } from '@soldy-ui/core'
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

/**
 * Группы из данных: метка группы — `_.group` в `items` или `groupBy`, порядок
 * и подписи — `groups`. Меню рисует секции показанного: группу с подписью —
 * `Menu.Group`, пункты без группы — последними, прямо в списке, между
 * секциями — разделитель. Стрелки ходят тем же порядком, что пункты стоят на
 * экране.
 */
describe('группы из данных', () => {
	/** В данных «Увеличить» и «Переименовать» стоят между пунктами «Правки». */
	const GROUPED = [
		{ value: 'cut', text: 'Вырезать', _: { group: 'edit' } },
		{ value: 'zoom', text: 'Увеличить', _: { group: 'view' } },
		{ value: 'rename', text: 'Переименовать' },
		{ value: 'copy', text: 'Копировать', _: { group: 'edit' } },
	]

	const GROUPS = [
		{ key: 'edit', label: 'Правка' },
		{ key: 'view', label: 'Вид' },
	]

	/** Части списка по порядку: группа — по подписи, разделитель, пункт — по тексту. */
	const parts = () =>
		[...find('.so-menu__list').children].map((node) => {
			if (node.classList.contains('so-menu-group')) {
				return `группа ${node.querySelector('.so-menu-group__label')?.textContent ?? ''}`
			}

			if (node.classList.contains('so-menu-separator')) return '—'

			return node.textContent?.trim()
		})

	/** Клавиша на узле и кадр модели фокуса. */
	async function press(target: HTMLElement, key: string): Promise<void> {
		target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))

		await nextTick()
		await nextFrame()
	}

	it('группы с подписью, разделитель — только между секциями, без группы — последними', async () => {
		await render(() => h(Menu, { items: GROUPED, groups: GROUPS }, { trigger }))

		expect(parts()).toEqual(['группа Правка', '—', 'группа Вид', '—', 'Переименовать'])
		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Вырезать',
			'Копировать',
			'Увеличить',
			'Переименовать',
		])

		const groups = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]

		for (const group of groups) {
			const label = find('.so-menu-group__label', group)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
		}

		expect(groups[0].contains(rowOf('Копировать'))).toBe(true)
		expect(
			[...panel().querySelectorAll('.so-menu-separator')].map((node) =>
				node.getAttribute('role'),
			),
		).toEqual(['separator', 'separator'])
	})

	it('стрелки ходят порядком экрана: ↓ с «Вырезать» — на «Копировать»', async () => {
		await render(() => h(Menu, { items: GROUPED, groups: GROUPS }, { trigger }))

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Вырезать'))

		await press(rowOf('Вырезать'), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Копировать'))

		await press(rowOf('Копировать'), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Увеличить'))

		await press(rowOf('Увеличить'), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Переименовать'))
	})

	it('смена подписи в groups перерисовывает подписи групп', async () => {
		const groups = ref(GROUPS)

		await render(() => h(Menu, { items: GROUPED, groups: groups.value }, { trigger }))

		groups.value = [
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'View' },
		]
		await nextTick()

		expect(parts()).toEqual(['группа Edit', '—', 'группа View', '—', 'Переименовать'])
	})

	it('groupBy пропом: ключ группы — из пункта', async () => {
		await render(() =>
			h(
				Menu,
				{
					items: ITEMS,
					groupBy: (item: IMenuItem) =>
						item.variant === 'danger' ? 'danger' : undefined,
					groups: [{ key: 'danger', label: 'Опасное' }],
				},
				{ trigger },
			),
		)

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('группировка через движок: engine.extensions.group после монтирования', async () => {
		const engine = createEngineMenu({ items: ITEMS })

		await render(() => h(Menu, { engine }, { trigger }))

		expect(parts()).toEqual(['Изменить', 'Удалить'])

		engine.extensions.group.groupBy = (item) => (item.value === 'remove' ? 'danger' : undefined)
		engine.extensions.group.groups = [{ key: 'danger', label: 'Опасное' }]
		await nextTick()

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('без группировки — ни групп, ни разделителей: пункты прямо в списке', async () => {
		await render(() => h(Menu, { items: ITEMS }, { trigger }))

		expect(parts()).toEqual(['Изменить', 'Удалить'])
		expect(panel().querySelector('.so-menu-group, .so-menu-separator')).toBeNull()
	})
})

/**
 * Контекстное меню — `open-on="contextmenu"`: в слоте `trigger` область, меню
 * вызывают над ней, и панель встаёт у точки вызова. Переходы плагинов —
 * `plugins/__tests__/menu.plugin.spec.ts`, расчёт у точки —
 * `setup/__tests__/overlay.spec.ts`; здесь — что проводка доводит точку от
 * ядра до якоря панели и что связка кнопки у области пуста.
 */
describe('контекстное меню', () => {
	/** Scope слота у области — что разметка отдала ей последним. */
	let scope: TTriggerScope | null = null

	/** Область — строка «файла», как у потребителя: связку из scope она берёт, если она есть. */
	const area = (given: TTriggerScope) => {
		scope = given

		return h('div', { class: 'so-test-area', ...given.triggerAria }, 'Отчёт.pdf')
	}

	const areaNode = () => find('.so-test-area')

	/** Правая кнопка мыши над областью в точке окна. */
	async function rightClick(x: number, y: number): Promise<void> {
		areaNode().dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 2 }),
		)
		areaNode().dispatchEvent(
			new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: x,
				clientY: y,
			}),
		)

		await nextTick()
	}

	afterEach(() => {
		scope = null
	})

	it('у области связки кнопки нет, у панели — роль и id, но не имя от триггера', async () => {
		await render(() => h(Menu, { items: ITEMS, openOn: 'contextmenu' }, { trigger: area }))

		expect(scope?.triggerAria).toEqual({})
		expect(areaNode().hasAttribute('aria-haspopup')).toBe(false)
		expect(areaNode().hasAttribute('aria-expanded')).toBe(false)
		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().id).not.toBe('')
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('правая кнопка открывает меню у точки вызова, повторная — переставляет панель', async () => {
		await render(() => h(Menu, { items: ITEMS, openOn: 'contextmenu' }, { trigger: area }))

		await rightClick(120, 80)

		expect(isOpen()).toBe(true)
		// Точка — в координатах окна: панель `fixed`, отступ 4px, как у кнопки
		expect(panel().style.position).toBe('fixed')
		expect(panel().style.left).toBe('120px')
		expect(panel().style.top).toBe('84px')

		await rightClick(300, 200)

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('300px')
		expect(panel().style.top).toBe('204px')
	})

	it('нажатие в области мимо вызова закрывает меню', async () => {
		await render(() => h(Menu, { items: ITEMS, openOn: 'contextmenu' }, { trigger: area }))

		await rightClick(120, 80)

		areaNode().dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }),
		)
		await nextTick()

		expect(isOpen()).toBe(false)
	})

	it('смена open-on на лету: у кнопки связка появляется, у области пропадает', async () => {
		const openOn = ref<'press' | 'contextmenu'>('press')

		await render(() => h(Menu, { items: ITEMS, openOn: openOn.value }, { trigger }))

		expect(triggerNode().getAttribute('aria-haspopup')).toBe('menu')

		openOn.value = 'contextmenu'
		await nextTick()

		expect(triggerNode().hasAttribute('aria-haspopup')).toBe(false)
		expect(triggerNode().hasAttribute('aria-controls')).toBe(false)
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)

		openOn.value = 'press'
		await nextTick()

		expect(triggerNode().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(triggerNode().id)
	})
})
