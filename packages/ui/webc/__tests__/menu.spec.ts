/**
 * `<span is="so-menu">` — Menu в Web Components, проводка целиком, на
 * настоящей разметке.
 *
 * Модель проверяет ядро (`core/__tests__/menu.spec.ts`), клавиши, указатель и
 * фокус — плагины (`plugins/__tests__/menu.plugin.spec.ts`); здесь важно, что
 * они сходятся: панель — деталь Frame, уехала в `body` и помечена владельцем,
 * роль и связки стоят на своих узлах, пункты из данных и разметкой входят в
 * коллекцию, клик строки действия закрывает меню и сообщает `choose`, флажок
 * отмечается и меню не закрывает. Сценарии — те же, что у Vue
 * (`ui/vue/__tests__/menu.spec.ts`); открытость и отметки, которые Vue держит
 * `v-model`, здесь видны событиями `so:change:*` и свойствами элементов.
 *
 * Своё у Web Components — разметка и слоты без scope. Корень меню и каждой
 * части — элемент потребителя (`<span is="so-menu">`, `<div is="so-menu-item">`
 * и соседи), строка пункта — Button на `div`, `<div is="so-button-div">`.
 * Связку с панелью триггер получает на первом элементе слота `trigger`, как у
 * Popover. Слоты пунктов из данных — образцы (`<template slot="item-leading">`),
 * копию которых получает каждый пункт, а подменю из данных — ещё и образцы
 * своих пунктов, под теми же именами. Пункт с подменю — часть с тремя
 * контекстами: пункт меню над ним и меню своих пунктов. Корень меню и части
 * только прячется, поэтому `rendered=false` меню, подменю и пункта с панелью
 * прячет и открытые панели в `body` под ними — свою и вложенных уровней —
 * признаком своего поддерева: у Vue их снимает `v-if` корня.
 *
 * Отрисовка — микрозадачей после смены ядра, слушатели плагинов — кадром позже.
 */

import { describe, it, expect, expectTypeOf, afterEach } from 'vitest'
import { TMenu, createEngineMenu } from '@soldy-ui/core'
import type {
	IMenuItem,
	IMenuItemSource,
	TCollectionEngineItemSource,
	TMenuCollection,
} from '@soldy-ui/core'
import {
	MenuCheckboxItemDescriptor,
	MenuDescriptor,
	MenuGroupDescriptor,
	MenuItemDescriptor,
	MenuPopoverItemDescriptor,
	MenuRadioGroupDescriptor,
	MenuRadioItemDescriptor,
	MenuSeparatorDescriptor,
	MenuSubmenuDescriptor,
	type IComponentDescriptor,
} from '@soldy-ui/setup'
import {
	TMenuCheckboxItemElement,
	TMenuElement,
	TMenuGroupElement,
	TMenuItemElement,
	TMenuRadioGroupElement,
	TMenuRadioItemElement,
	TMenuSubmenuElement,
	defineElement,
	type ITemplate,
	type TMenuCheckboxItemElementProps,
	type TMenuElementProps,
	type TMenuGroupElementProps,
	type TMenuItemElementProps,
	type TMenuPopoverItemElementProps,
	type TMenuRadioGroupElementProps,
	type TMenuRadioItemElementProps,
	type TMenuSubmenuElementProps,
} from '@soldy-ui/webc'
import { menuTemplate } from '../src/components/menu/menu.template'
import { menuItemTemplate } from '../src/components/menu/item/menu-item.template'
import { menuCheckboxItemTemplate } from '../src/components/menu/checkbox-item/menu-checkbox-item.template'
import { menuRadioItemTemplate } from '../src/components/menu/radio-item/menu-radio-item.template'
import { menuSubmenuTemplate } from '../src/components/menu/submenu/menu-submenu.template'
import { menuPopoverItemTemplate } from '../src/components/menu/popover-item/menu-popover-item.template'
import { menuGroupTemplate } from '../src/components/menu/group/menu-group.template'
import { menuRadioGroupTemplate } from '../src/components/menu/radio-group/menu-radio-group.template'
import { menuSeparatorTemplate } from '../src/components/menu/separator/menu-separator.template'
import { bareContext } from './template-context'

/** Отрисовка коалесцируется в микротаске — ждём её перед проверкой. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(() => resolve()))

/** `TElementPlugin` объявляет узел через кадр — после него встают слушатели плагинов. */
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

afterEach(() => {
	document.body.innerHTML = ''
})

/** Триггер так, как его кладёт потребитель: Button в слоте `trigger`. */
const TRIGGER =
	'<button is="so-button" slot="trigger" class="so-test-trigger" text="Действия"></button>'

function isMenu(node: Element | null): node is TMenuElementProps {
	return node instanceof TMenuElement
}

function isItem(node: Element | null): node is TMenuItemElementProps {
	return node instanceof TMenuItemElement
}

function isCheckbox(node: Element | null): node is TMenuCheckboxItemElementProps {
	return node instanceof TMenuCheckboxItemElement
}

function isRadio(node: Element | null): node is TMenuRadioItemElementProps {
	return node instanceof TMenuRadioItemElement
}

function isRadioGroup(node: Element | null): node is TMenuRadioGroupElementProps {
	return node instanceof TMenuRadioGroupElement
}

function isGroup(node: Element | null): node is TMenuGroupElementProps {
	return node instanceof TMenuGroupElement
}

function isSubmenu(node: Element | null): node is TMenuSubmenuElementProps {
	return node instanceof TMenuSubmenuElement
}

/** Что рисует страница: атрибуты меню, его пункты, триггер, свойства и соседи. */
type TPage = {
	/** Атрибуты разметки меню. */
	readonly attrs?: string
	/** Свет меню после триггера — пункты разметкой и образцы. */
	readonly content?: string
	/** Триггер — свет слота `trigger`. */
	readonly trigger?: string
	/** Свойства меню — до вставки: сборка берёт их при подключении. */
	readonly props?: Readonly<Record<string, unknown>>
	/** Кнопки страницы до и после меню — откуда прийти и куда уйти по Tab. */
	readonly around?: boolean
}

/**
 * Меню на странице — разметкой, как его пишет потребитель. Элементы живые уже
 * до вставки (`innerHTML` в неподключённом узле), и свойства ставятся до
 * подключения. После вставки — микрозадача отрисовки и кадр: корень плагины
 * получают через `requestAnimationFrame`.
 */
async function render({
	attrs = '',
	content = '',
	trigger = TRIGGER,
	props = {},
	around = false,
}: TPage = {}): Promise<TMenuElementProps> {
	const page = document.createElement('div')

	page.innerHTML = `${around ? '<button class="so-test-before">До</button>' : ''}
		<span is="so-menu" ${attrs}>${trigger}${content}</span>
		${around ? '<button class="so-test-after">После</button>' : ''}`

	const menu = page.querySelector('[is="so-menu"]')

	if (!isMenu(menu)) throw new Error('<span is="so-menu"> нет')

	for (const [name, value] of Object.entries(props)) Reflect.set(menu, name, value)

	document.body.appendChild(page)
	await flush()
	await nextFrame()

	return menu
}

/** Узел по селектору; нет его — тест падает здесь, а не на чтении свойства. */
function find(selector: string, scope: ParentNode = document): HTMLElement {
	const element = scope.querySelector(selector)

	if (!(element instanceof HTMLElement)) throw new Error(`${selector}: HTML-узла нет`)

	return element
}

/** Элемент части по селектору и её виду; нет его — тест падает здесь. */
function part<T extends Element>(
	selector: string,
	guard: (node: Element | null) => node is T,
	scope: ParentNode = document,
): T {
	const node = scope.querySelector(selector)

	if (!guard(node)) throw new Error(`${selector}: элемента части нет`)

	return node
}

const triggerNode = () => find('.so-test-trigger')

/** Панель по `id` — так на неё ссылается `aria-controls`. */
const panelOf = (node: HTMLElement): HTMLElement =>
	find(`#${node.getAttribute('aria-controls') ?? ''}`)

/** Панель меню — первая панель меню в документе: панели подменю уезжают следом. */
const panel = () => find('.so-menu__panel')
const shown = (node: HTMLElement) => node.style.display !== 'none'
const isOpen = () => shown(panel())

/** Строки пунктов по порядку — узлы с ролью. */
const rows = (scope: ParentNode = panel()) => [
	...scope.querySelectorAll<HTMLElement>('[role^="menuitem"]'),
]

/** Текст строки — её текстовая часть, без значка, отметки и подсказки по краям. */
const labelOf = (row: Element) => row.querySelector('.so-button__text')?.textContent?.trim()

/** Строка пункта по тексту. */
function rowOf(text: string, scope: ParentNode = panel()): HTMLElement {
	const row = rows(scope).find((candidate) => labelOf(candidate)?.startsWith(text))

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Тексты строк пунктов-действий и подменю по порядку. */
const texts = (scope: ParentNode) =>
	[...scope.querySelectorAll('[role="menuitem"]')].map((row) => row.textContent?.trim())

/** Значения `detail` событий с этим именем — те, что пришли на сам элемент. */
function collect(el: Element, name: string): unknown[] {
	const seen: unknown[] = []

	el.addEventListener(name, (event) => {
		if (event instanceof CustomEvent && event.target === el) seen.push(event.detail)
	})

	return seen
}

/** Значения пунктов, о выборе которых сообщило `so:choose`. */
function chosenOf(el: Element): unknown[] {
	const chosen: unknown[] = []

	el.addEventListener('so:choose', (event) => {
		if (event instanceof CustomEvent && event.target === el && isMenuItem(event.detail)) {
			chosen.push(event.detail.value)
		}
	})

	return chosen
}

function isMenuItem(value: unknown): value is IMenuItem {
	return typeof value === 'object' && value !== null && 'value' in value && 'uid' in value
}

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик — и отрисовка. */
async function click(target: HTMLElement): Promise<void> {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

	await flush()
}

/** Открыть кликом по триггеру и дождаться кадра модели фокуса. */
async function open(): Promise<void> {
	await click(triggerNode())
	await nextFrame()
}

/** Клавиша на узле, отрисовка и кадр модели фокуса. Отдаёт событие: по нему видно, погашена ли она. */
async function press(
	target: HTMLElement,
	key: string,
	init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	target.dispatchEvent(event)
	await flush()
	await nextFrame()

	return event
}

const ITEMS = [
	{ value: 'edit', text: 'Изменить' },
	{ value: 'remove', text: 'Удалить', variant: 'danger' as const },
]

describe('разметка', () => {
	it('корень — span с триггером, панель уехала в body и скрыта', async () => {
		const root = await render({ props: { items: ITEMS } })

		expect(root.localName).toBe('span')
		expect(root.classList.contains('so-menu')).toBe(true)
		expect(root.contains(triggerNode())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — меню с именем от кнопки, триггер ссылается на панель', async () => {
		await render({ props: { items: ITEMS } })

		const button = triggerNode()

		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().getAttribute('tabindex')).toBe('-1')
		expect(button.getAttribute('aria-haspopup')).toBe('menu')
		expect(button.getAttribute('aria-expanded')).toBe('false')
		expect(button.getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(button.id)
		expect(button.id).not.toBe('')
		// Список — только прокрутка: роли у него нет
		expect(find('.so-menu__list').hasAttribute('role')).toBe(false)
		// ARIA — у панели и у триггера, не на корне
		expect(find('.so-menu').hasAttribute('role')).toBe(false)
	})

	it('пункты из данных — действия: строка с ролью и вне обхода Tab', async () => {
		await render({ props: { items: ITEMS } })

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Изменить', 'Удалить'])
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['menuitem', 'menuitem'])
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
		expect(rows().some((row) => row.hasAttribute('aria-checked'))).toBe(false)
		// Строка — кнопка на div, прямой ребёнок пункта
		expect(rows().every((row) => row.localName === 'div')).toBe(true)
		expect(rows().every((row) => row.parentElement?.classList.contains('so-menu-item'))).toBe(
			true,
		)
	})

	it('размер и вариант меню — модификаторами панели, свой вариант — у пункта', async () => {
		await render({ attrs: 'size="lg" variant="brand"', props: { items: ITEMS } })

		expect(panel().classList).toContain('so-menu__panel--size-lg')
		expect(panel().classList).toContain('so-menu__panel--variant-brand')
		// Свой класс Frame — рядом с классами панели меню
		expect(panel().classList).toContain('so-frame')

		const [edit, remove] = [...panel().querySelectorAll('.so-menu-item')]

		expect(edit.classList).toContain('so-menu-item--size-lg')
		expect(remove.classList).toContain('so-menu-item--size-lg')
		// Вариант меню пункту не пишется: тема красит его с панели
		expect([...edit.classList].some((cls) => cls.includes('--variant-'))).toBe(false)
		expect(remove.classList).toContain('so-menu-item--variant-danger')
	})

	it('смена размера меняет модификатор панели, а не копит их', async () => {
		const menu = await render({ props: { items: ITEMS } })

		menu.size = 'lg'
		await flush()

		menu.size = 'sm'
		await flush()

		const sizes = [...panel().classList].filter((cls) => cls.includes('--size-'))

		expect(sizes).toEqual(['so-menu__panel--size-sm'])
	})

	/**
	 * Scope у слотов нет: слоты пунктов из данных — образцы, и копию получает
	 * каждый пункт. Данные своего пункта копия берёт у него — `el.ctrl`.
	 */
	it('образцы item-* — копии в каждом пункте из данных, в его слотах', async () => {
		await render({
			props: { items: ITEMS },
			content: `<template slot="item-leading"><i class="so-test-icon"></i></template>
				<template slot="item">Пункт…</template>
				<template slot="item-trailing"><kbd class="so-test-key">Ctrl</kbd></template>`,
		})

		const [edit, remove] = rows()

		expect(edit.querySelector('.so-menu-item__icon .so-test-icon')).not.toBeNull()
		expect(remove.querySelector('.so-menu-item__icon .so-test-icon')).not.toBeNull()
		expect(find('.so-button__text', edit).textContent).toBe('Пункт…')
		expect(find('.so-menu-item__shortcut .so-test-key', remove).textContent).toBe('Ctrl')
		// Копия у каждого пункта своя
		expect(edit.querySelector('.so-test-icon')).not.toBe(remove.querySelector('.so-test-icon'))
		// Образцы в документ не выводятся
		expect(find('.so-menu').querySelector('template')).toBeNull()
	})

	it('пустые значок и подсказка — без содержимого: тема прячет их по :empty', async () => {
		await render({ props: { items: ITEMS } })

		for (const row of rows()) {
			expect(find('.so-menu-item__icon', row).childNodes).toHaveLength(0)
			expect(find('.so-menu-item__shortcut', row).childNodes).toHaveLength(0)
		}
	})

	it('пункт разметкой: слоты leading, default и trailing — в своих местах строки', async () => {
		await render({
			content: `<div is="so-menu-item" value="save" text="Сохранить">
				<i slot="leading" class="so-test-icon">★</i>
				<span slot="trailing">Ctrl+S</span>
			</div>
			<div is="so-menu-item" value="open"><b>Открыть</b></div>`,
		})

		const save = rowOf('Сохранить')

		expect(find('.so-menu-item__icon .so-test-icon', save).textContent).toBe('★')
		expect(find('.so-menu-item__shortcut', save).textContent).toBe('Ctrl+S')
		expect(find('.so-button__text', save).textContent).toBe('Сохранить')
		expect(find('.so-button__text b', rowOf('Открыть')).textContent).toBe('Открыть')
	})

	/** Атрибуты разметки пункта, кроме класса, стиля и входов, — строке, где роль. */
	it('атрибуты разметки пункта — на строке, класс — на корне', async () => {
		await render({
			content:
				'<div is="so-menu-item" value="edit" text="Изменить" class="mine" aria-label="Правка" data-test="x"></div>',
		})

		const item = part('[is="so-menu-item"]', isItem)
		const row = rowOf('Изменить')

		expect(item.classList.contains('mine')).toBe(true)
		expect(item.hasAttribute('aria-label')).toBe(false)
		expect(row.getAttribute('aria-label')).toBe('Правка')
		expect(row.dataset['test']).toBe('x')
	})

	it('ARIA и data-* стоят на своих элементах', async () => {
		const root = await render({ props: { items: ITEMS } })

		await open()

		expect(root.dataset['open']).toBe('true')
		expect(triggerNode().dataset['selected']).toBe('true')
		// `data-open` у панели свой, от её слоя (Frame)
		expect(panel().dataset['open']).toBe('true')
		expect(panel().dataset['layer']).toMatch(/^\d+$/)
		expect(panel().dataset['owner']).not.toBeUndefined()
	})
})

describe('шаблоны объявляют ровно те слоты, что и дескрипторы', () => {
	/** Точки слотов шаблона — в пустом корне, где ни один слот не задан. */
	function slotsOf<TInstance, TFacade, TOutputs, TOwnerFacade>(
		template: ITemplate<TInstance, TFacade, TOutputs, TOwnerFacade>,
	): string[] {
		const root = document.createElement('div')
		const ctx = { ...bareContext<TInstance, TFacade>(root), state: {} }
		const targets = template.create(root, ctx)

		return Object.keys(targets.slots).sort()
	}

	const names = (descriptor: IComponentDescriptor) =>
		descriptor.slots.map((slot) => slot.name).sort()

	it.each([
		['Menu', () => slotsOf(menuTemplate), MenuDescriptor],
		['Menu.Item', () => slotsOf(menuItemTemplate), MenuItemDescriptor],
		['Menu.CheckboxItem', () => slotsOf(menuCheckboxItemTemplate), MenuCheckboxItemDescriptor],
		['Menu.RadioItem', () => slotsOf(menuRadioItemTemplate), MenuRadioItemDescriptor],
		['Menu.Submenu', () => slotsOf(menuSubmenuTemplate), MenuSubmenuDescriptor],
		['Menu.PopoverItem', () => slotsOf(menuPopoverItemTemplate), MenuPopoverItemDescriptor],
		['Menu.Group', () => slotsOf(menuGroupTemplate), MenuGroupDescriptor],
		['Menu.RadioGroup', () => slotsOf(menuRadioGroupTemplate), MenuRadioGroupDescriptor],
		['Menu.Separator', () => slotsOf(menuSeparatorTemplate), MenuSeparatorDescriptor],
	] as const)('%s', (_name, slots, descriptor) => {
		expect(slots()).toEqual(names(descriptor()))
	})
})

describe('открытие', () => {
	it('клик по триггеру открывает меню, повторный — закрывает', async () => {
		const root = await render({ props: { items: ITEMS } })

		await open()

		expect(isOpen()).toBe(true)
		expect(triggerNode().getAttribute('aria-expanded')).toBe('true')
		expect(triggerNode().dataset['selected']).toBe('true')
		expect(root.dataset['open']).toBe('true')

		await click(triggerNode())

		expect(isOpen()).toBe(false)
		expect(triggerNode().getAttribute('aria-expanded')).toBe('false')
	})

	it('open свойством элемента и из инстанса — в обе стороны, so:change:open видит оба пути', async () => {
		const menu = new TMenu()
		const el = await render({ props: { ctrl: menu, items: ITEMS } })
		const opens = collect(el, 'so:change:open')

		el.open = true
		await flush()

		expect(isOpen()).toBe(true)

		await click(triggerNode())

		expect(menu.open).toBe(false)
		expect(el.open).toBe(false)

		menu.open = true
		await flush()

		expect(isOpen()).toBe(true)
		expect(opens).toEqual([true, false, true])
	})

	/**
	 * Корень — элемент потребителя, и `rendered=false` его прячет, а не
	 * снимает. Панель уехала в `body`, и скрытие корня до неё не доходит:
	 * прячет её база Frame по признаку поддерева меню.
	 */
	it('rendered=false прячет корень и открытую панель в body, rendered=true — панель снова открыта', async () => {
		const el = await render({ props: { items: ITEMS } })

		await open()

		el.rendered = false
		await flush()

		expect(el.style.display).toBe('none')
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
		expect(el.open).toBe(true)

		el.rendered = true
		await flush()

		expect(el.style.display).toBe('')
		expect(isOpen()).toBe(true)
	})

	it('триггер — тот же узел, что написал потребитель; связка на нём сменяется на месте', async () => {
		await render({ props: { items: ITEMS } })

		const button = triggerNode()

		await open()
		await click(triggerNode())

		expect(triggerNode()).toBe(button)
		expect(button.getAttribute('aria-expanded')).toBe('false')
		expect(button.dataset['selected']).toBe('false')
	})
})

describe('нажатие пунктов', () => {
	it('клик строки действия закрывает меню, сообщает so:choose и возвращает фокус', async () => {
		const el = await render({ props: { items: ITEMS } })
		const chosen = chosenOf(el)

		await open()
		await click(rowOf('Удалить'))

		expect(chosen).toEqual(['remove'])
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Enter на строке — её клик: пункт нажат один раз', async () => {
		const el = await render({ props: { items: ITEMS } })
		const chosen = chosenOf(el)

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Изменить'))

		await press(rowOf('Изменить'), 'Enter')

		expect(chosen).toEqual(['edit'])
		expect(isOpen()).toBe(false)
	})

	it('выключенный пункт не нажимается', async () => {
		const el = await render({
			props: { items: [{ value: 'edit', text: 'Изменить', disabled: true }] },
		})
		const chosen = chosenOf(el)

		await open()
		await click(rowOf('Изменить'))

		expect(rowOf('Изменить').getAttribute('aria-disabled')).toBe('true')
		expect(chosen).toEqual([])
		expect(isOpen()).toBe(true)
	})

	/** Пункт разметки — элемент потребителя: его события всплывают, как у любого. */
	it('пункт разметкой нажимается так же, so:choose — у меню', async () => {
		const el = await render({
			content: `<div is="so-menu-item" value="edit" text="Изменить"></div>
				<div is="so-menu-item" value="remove" text="Удалить"></div>`,
		})
		const chosen = chosenOf(el)

		await open()
		await click(rowOf('Удалить'))

		expect(chosen).toEqual(['remove'])
		expect(isOpen()).toBe(false)
	})

	it('флажок отмечается кликом и меню не закрывает: selected и so:change:selected', async () => {
		const el = await render({
			content: `<div is="so-menu-checkbox-item" value="grid" text="Сетка"></div>
				<div is="so-menu-checkbox-item" value="ruler" text="Линейка" selected></div>`,
		})
		const chosen = chosenOf(el)
		const grid = part('[value="grid"]', isCheckbox)
		const marks = collect(grid, 'so:change:selected')

		await open()

		expect(rowOf('Сетка').getAttribute('role')).toBe('menuitemcheckbox')
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')

		await click(rowOf('Сетка'))

		expect(grid.selected).toBe(true)
		expect(marks).toEqual([true])
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		// Отметки флажков независимы, меню открыто, choose нет
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')
		expect(isOpen()).toBe(true)
		expect(chosen).toEqual([])

		grid.selected = false
		await flush()

		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
	})

	it('отметка рисуется только у отмеченного флажка, обёртка — у всех флажков', async () => {
		await render({
			content: `<div is="so-menu-checkbox-item" value="grid" text="Сетка"></div>
				<div is="so-menu-checkbox-item" value="ruler" text="Линейка" selected></div>
				<div is="so-menu-item" value="edit" text="Изменить"></div>`,
		})

		const indicator = (text: string) => rowOf(text).querySelector('.so-menu-item__indicator')

		expect(indicator('Сетка')?.getAttribute('aria-hidden')).toBe('true')
		expect(indicator('Сетка')?.childNodes).toHaveLength(0)
		expect(indicator('Линейка')?.querySelector('.so-icon')?.getAttribute('icon')).toBe('check')
		expect(indicator('Изменить')).toBeNull()
		// Отметка — первой у начала строки, значок — за ней
		expect(rowOf('Сетка').firstElementChild?.className).toBe('so-menu-item__indicator')
	})

	/**
	 * Scope у слотов нет: слот `indicator-icon` — отметка отмеченного, и его
	 * выводит привязка только у отмеченного, у остальных он вне документа.
	 */
	it('слот indicator-icon флажка — вместо своей иконки и только у отмеченного', async () => {
		await render({
			content: `<div is="so-menu-checkbox-item" value="grid" text="Сетка">
				<i slot="indicator-icon" class="so-test-mark">✓</i>
			</div>`,
		})

		const grid = part('[value="grid"]', isCheckbox)

		expect(document.querySelector('.so-test-mark')).toBeNull()
		expect(rowOf('Сетка').querySelector('.so-icon')).toBeNull()

		grid.selected = true
		await flush()

		expect(find('.so-menu-item__indicator .so-test-mark', rowOf('Сетка')).textContent).toBe('✓')
	})
})

/**
 * Переключатели: `<div is="so-menu-radio-group">` со своим значением и
 * `<div is="so-menu-radio-item">` в ней. Отметка — выбор коллекции меню, и в
 * группе отмечен один; группу переключатель берёт лифтом.
 */
describe('переключатели', () => {
	/** Меню с группой «Сортировка» и флажком рядом. */
	const SORT = (value = '') => `<div is="so-menu-radio-group" label="Сортировка" ${value}>
			<div is="so-menu-radio-item" value="name" text="По имени"></div>
			<div is="so-menu-radio-item" value="date" text="По дате"></div>
		</div>
		<div is="so-menu-separator"></div>
		<div is="so-menu-checkbox-item" value="grid" text="Сетка" selected></div>`

	const checked = () => rows().map((row) => row.getAttribute('aria-checked'))
	const group = () => part('[is="so-menu-radio-group"]', isRadioGroup)

	it('группа — group с именем от подписи, переключатели — menuitemradio вне обхода Tab', async () => {
		await render({ content: SORT() })

		const node = find('.so-menu-group')
		const label = find('.so-menu-group__label', node)

		expect(node).toBe(group())
		expect(node.getAttribute('role')).toBe('group')
		expect(node.getAttribute('aria-labelledby')).toBe(label.id)
		expect(label.textContent).toBe('Сортировка')
		expect(rowOf('По имени').getAttribute('role')).toBe('menuitemradio')
		expect(rowOf('По дате').getAttribute('tabindex')).toBe('-1')
		expect(checked()).toEqual(['false', 'false', 'true'])
	})

	it('клик отмечает переключатель и меню не закрывает: value группы и so:change:value', async () => {
		const el = await render({ content: SORT() })
		const chosen = chosenOf(el)
		const values = collect(group(), 'so:change:value')

		await open()
		await click(rowOf('По имени'))

		expect(group().value).toBe('name')
		expect(checked()).toEqual(['true', 'false', 'true'])

		await click(rowOf('По дате'))

		// В группе отмечен один, флажок — сам по себе
		expect(group().value).toBe('date')
		expect(checked()).toEqual(['false', 'true', 'true'])

		// Отмеченный нажатием не снимается
		await click(rowOf('По дате'))

		expect(group().value).toBe('date')
		expect(isOpen()).toBe(true)
		expect(chosen).toEqual([])
		expect(values.length).toBeGreaterThan(0)
	})

	it('значение из приложения отмечает свой переключатель, без него — ни один', async () => {
		await render({ content: SORT('value="date"') })

		expect(checked()).toEqual(['false', 'true', 'true'])

		group().value = 'name'
		await flush()

		expect(checked()).toEqual(['true', 'false', 'true'])

		group().value = 'size'
		await flush()

		expect(checked()).toEqual(['false', 'false', 'true'])
	})

	it('selected у переключателя — его отметка: значение группы и сосед за ней', async () => {
		await render({
			content: `<div is="so-menu-radio-group" value="name">
				<div is="so-menu-radio-item" value="name" text="name" selected></div>
				<div is="so-menu-radio-item" value="date" text="date"></div>
			</div>`,
		})

		const name = part('[is="so-menu-radio-item"][value="name"]', isRadio)
		const date = part('[is="so-menu-radio-item"][value="date"]', isRadio)

		date.selected = true
		await flush()

		expect(group().value).toBe('date')
		expect(name.selected).toBe(false)
		expect(checked()).toEqual(['false', 'true'])
	})

	it('точка рисуется только у отмеченного, обёртка отметки — у всех переключателей', async () => {
		await render({ content: SORT('value="name"') })

		const indicator = (text: string) => find('.so-menu-item__indicator', rowOf(text))

		expect(indicator('По имени').getAttribute('aria-hidden')).toBe('true')
		expect(indicator('По имени').querySelector('.so-menu-item__dot')).not.toBeNull()
		expect(indicator('По дате').querySelector('.so-menu-item__dot')).toBeNull()
		expect(indicator('По дате').childNodes).toHaveLength(0)
	})

	it('две группы одного меню независимы', async () => {
		await render({
			content: `<div is="so-menu-radio-group" class="so-test-sort" value="name">
				<div is="so-menu-radio-item" value="name" text="name"></div>
				<div is="so-menu-radio-item" value="date" text="date"></div>
			</div>
			<div is="so-menu-radio-group" class="so-test-order" value="asc">
				<div is="so-menu-radio-item" value="asc" text="asc"></div>
				<div is="so-menu-radio-item" value="desc" text="desc"></div>
			</div>`,
		})

		await open()
		await click(rowOf('date'))
		await click(rowOf('desc'))

		expect([
			part('.so-test-sort', isRadioGroup).value,
			part('.so-test-order', isRadioGroup).value,
		]).toEqual(['date', 'desc'])
		expect(checked()).toEqual(['false', 'true', 'false', 'true'])
	})

	it('слот indicator-icon переключателя подменяет точку — у отмеченного', async () => {
		await render({
			content: `<div is="so-menu-radio-group" value="name">
				<div is="so-menu-radio-item" value="name" text="По имени">
					<i slot="indicator-icon" class="so-test-mark"></i>
				</div>
			</div>`,
		})

		expect(
			rowOf('По имени').querySelector('.so-menu-item__indicator .so-test-mark'),
		).not.toBeNull()
		expect(rowOf('По имени').querySelector('.so-menu-item__dot')).toBeNull()
	})
})

describe('группа и разделитель', () => {
	it('группа — group с именем от подписи, пункты в ней — пункты меню, навигация сквозь группы', async () => {
		await render({
			content: `<div is="so-menu-group" label="Вид">
				<div is="so-menu-checkbox-item" value="grid" text="Сетка"></div>
			</div>
			<div is="so-menu-separator"></div>
			<div is="so-menu-group">
				<div is="so-menu-item" value="edit" text="Изменить"></div>
			</div>`,
		})

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

		// Навигация идёт сквозь группы: ↑ с триггера — последний пункт
		triggerNode().focus()
		await press(triggerNode(), 'ArrowUp')

		expect(document.activeElement).toBe(rowOf('Изменить'))
	})

	it('смена подписи группы — новый текст на том же узле, пустая — подписи нет', async () => {
		await render({
			content: `<div is="so-menu-group" label="Вид">
				<div is="so-menu-item" value="edit" text="Изменить"></div>
			</div>`,
		})

		const group = part('[is="so-menu-group"]', isGroup)
		const label = find('.so-menu-group__label', group)

		group.label = 'Отображение'
		await flush()

		expect(find('.so-menu-group__label', group)).toBe(label)
		expect(label.textContent).toBe('Отображение')
		expect(group.firstElementChild).toBe(label)

		group.label = ''
		await flush()

		expect(group.querySelector('.so-menu-group__label')).toBeNull()
		expect(group.hasAttribute('aria-labelledby')).toBe(false)
	})
})

/**
 * Группы из данных: метка группы — `_.group` в `items` или `groupBy`, порядок
 * и подписи — `groups`. Меню рисует секции показанного: группу с подписью —
 * `<div is="so-menu-group">`, пункты без группы — прямо в списке, между
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
	const parts = (scope: ParentNode = panel()) =>
		[...find('.so-menu__list', scope).children].map((node) => {
			if (node.classList.contains('so-menu-group')) {
				return `группа ${node.querySelector('.so-menu-group__label')?.textContent ?? ''}`
			}

			if (node.classList.contains('so-menu-separator')) return '—'

			return node.textContent?.trim()
		})

	it('группы с подписью, разделитель — только между секциями, без группы — последними', async () => {
		await render({ props: { items: GROUPED, groups: GROUPS } })

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
		await render({ props: { items: GROUPED, groups: GROUPS } })

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

	it('смена подписи в groups перерисовывает подписи групп — на тех же узлах', async () => {
		const menu = await render({ props: { items: GROUPED, groups: GROUPS } })
		const group = find('.so-menu-group')
		const items = [...panel().querySelectorAll('.so-menu-item')]

		menu.groups = [
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'View' },
		]
		await flush()

		expect(parts()).toEqual(['группа Edit', '—', 'группа View', '—', 'Переименовать'])
		expect(find('.so-menu-group')).toBe(group)
		;[...panel().querySelectorAll('.so-menu-item')].forEach((node, index) =>
			expect(node).toBe(items[index]),
		)
	})

	it('groupBy свойством: ключ группы — из пункта', async () => {
		await render({
			props: {
				items: ITEMS,
				groupBy: (item: IMenuItem) => (item.variant === 'danger' ? 'danger' : undefined),
				groups: [{ key: 'danger', label: 'Опасное' }],
			},
		})

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('группировка через движок: engine.extensions.group после монтирования', async () => {
		const engine = createEngineMenu({ items: ITEMS })

		await render({ props: { engine } })

		expect(parts()).toEqual(['Изменить', 'Удалить'])

		engine.extensions.group.groupBy = (item) => (item.value === 'remove' ? 'danger' : undefined)
		engine.extensions.group.groups = [{ key: 'danger', label: 'Опасное' }]
		await flush()

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('без группировки — ни групп, ни разделителей: пункты прямо в списке', async () => {
		await render({ props: { items: ITEMS } })

		expect(parts()).toEqual(['Изменить', 'Удалить'])
		expect(panel().querySelector('.so-menu-group, .so-menu-separator')).toBeNull()
	})

	it('groupSeparators=false — секции без разделителей, порядок и группы те же', async () => {
		await render({ props: { items: GROUPED, groups: GROUPS, groupSeparators: false } })

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])
		expect(panel().querySelector('.so-menu-separator')).toBeNull()
	})

	it('groupSeparators на лету ставит и снимает разделители', async () => {
		const menu = await render({
			props: { items: GROUPED, groups: GROUPS, groupSeparators: false },
		})

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])

		menu.groupSeparators = true
		await flush()

		expect(parts()).toEqual(['группа Правка', '—', 'группа Вид', '—', 'Переименовать'])

		menu.groupSeparators = false
		await flush()

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])
	})

	it('ручной разделитель разметки свойство не трогает', async () => {
		await render({
			props: { groupSeparators: false },
			content: `<div is="so-menu-item" value="edit" text="Изменить"></div><div is="so-menu-separator"></div><div is="so-menu-item" value="remove" text="Удалить"></div>`,
		})

		expect(parts()).toEqual(['Изменить', '—', 'Удалить'])
	})

	/** Группа и разделитель из данных — разметка меню: их события не всплывают. */
	it('группа и разделитель из данных — части меню: so:element:ready до меню не доходит', async () => {
		const page = document.createElement('div')
		const menu = document.createElement('span', { is: 'so-menu' })
		const ready: unknown[] = []

		if (!isMenu(menu)) throw new Error('<span is="so-menu"> нет')

		menu.items = GROUPED
		menu.groups = GROUPS
		menu.addEventListener('so:element:ready', (event) => {
			if (event instanceof CustomEvent) ready.push(event.detail)
		})
		page.appendChild(menu)
		document.body.appendChild(page)
		await flush()
		await nextFrame()

		expect(ready).toEqual([menu])
	})
})

/**
 * Группы разметки — `<div is="so-menu-group">` и `<div is="so-menu-radio-group">`
 * — входят в ту же группировку, что группы из данных: их ключ пункты внутри
 * берут лифтом, подпись группа регистрирует в группировке, и `sections`
 * описывают их. Пункт вне группы пишут и над группами.
 */
describe('группы разметки', () => {
	/** «Новый» — над группой «Правка», «Закрыть» — под группой переключателей. */
	const MARKUP = `<div is="so-menu-item" value="new" text="Новый"></div>
		<div is="so-menu-group" label="Правка">
			<div is="so-menu-item" value="cut" text="Вырезать"></div>
			<div is="so-menu-item" value="copy" text="Копировать"></div>
		</div>
		<div is="so-menu-separator"></div>
		<div is="so-menu-radio-group" label="Сортировка" value="name">
			<div is="so-menu-radio-item" value="name" text="По имени"></div>
			<div is="so-menu-radio-item" value="date" text="По дате"></div>
		</div>
		<div is="so-menu-item" value="close" text="Закрыть"></div>`

	/** Секции коротко: подпись группы (`null` — без группы) и значения пунктов. */
	const brief = (engine: TMenuCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('секции — группы разметки с подписью, пункты вне групп — на своих местах', async () => {
		const engine = createEngineMenu()

		await render({ props: { engine }, content: MARKUP })

		expect(brief(engine)).toEqual([
			[null, ['new']],
			['Правка', ['cut', 'copy']],
			['Сортировка', ['name', 'date']],
			[null, ['close']],
		])
		expect(engine.extensions.group.groups).toEqual([])
	})

	it('стрелки ходят порядком экрана: «Новый» над группой — первым', async () => {
		await render({ props: { engine: createEngineMenu() }, content: MARKUP })

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		const visited = [document.activeElement]

		for (let step = 1; step < rows().length; step += 1) {
			const current = document.activeElement

			if (!(current instanceof HTMLElement)) throw new Error('фокус — не на строке')

			await press(current, 'ArrowDown')
			visited.push(document.activeElement)
		}

		expect(visited).toEqual(rows())
		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Новый',
			'Вырезать',
			'Копировать',
			'По имени',
			'По дате',
			'Закрыть',
		])
	})

	it('смена подписи группы разметки — новая подпись секции', async () => {
		const engine = createEngineMenu()

		await render({ props: { engine }, content: MARKUP })

		part('[is="so-menu-group"]', isGroup).label = 'Изменение'
		await flush()

		expect(brief(engine)[1]).toEqual(['Изменение', ['cut', 'copy']])
	})

	/**
	 * Разметка написана раньше, чем зарегистрированы элементы: пункты разных
	 * видов вперемешку — действия, флажки, группа переключателей, подменю в
	 * группе, а в подменю своя группа. Ожившую при регистрации разметку база
	 * собирает по месту, и порядок регистрации видов ничего не решает: меню,
	 * группы и подменю собираются раньше своих пунктов, пункты входят в
	 * коллекцию в порядке документа, подменю в группе берёт её ключ, а группа в
	 * подменю даёт ключ его пунктам. Имена — свои у каждого порядка:
	 * зарегистрированные пакетом уже живые, а имя регистрируется один раз.
	 */
	describe('разметка до регистрации', () => {
		/** Виды частей — в порядке модуля меню (`Menu.element.ts`): имя, класс и тег. */
		const KINDS: readonly (readonly [string, () => CustomElementConstructor, string])[] = [
			['menu', () => class extends TMenuElement {}, 'span'],
			['group', () => class extends TMenuGroupElement {}, 'div'],
			['radio-group', () => class extends TMenuRadioGroupElement {}, 'div'],
			['submenu', () => class extends TMenuSubmenuElement {}, 'div'],
			['item', () => class extends TMenuItemElement {}, 'div'],
			['checkbox', () => class extends TMenuCheckboxItemElement {}, 'div'],
			['radio', () => class extends TMenuRadioItemElement {}, 'div'],
		]

		/** Меню разметкой: имена частей — `<префикс>-<вид>`. */
		const markup = (prefix: string) => `<span is="${prefix}-menu">
			<div is="${prefix}-item" value="new" text="Новый"></div>
			<div is="${prefix}-checkbox" value="grid" text="Сетка"></div>
			<div is="${prefix}-radio-group" label="Сортировка" value="name">
				<div is="${prefix}-radio" value="name" text="По имени"></div>
				<div is="${prefix}-radio" value="date" text="По дате"></div>
			</div>
			<div is="${prefix}-group" label="Правка">
				<div is="${prefix}-item" value="cut" text="Вырезать"></div>
				<div is="${prefix}-submenu" value="share" text="Поделиться">
					<div is="${prefix}-item" value="link" text="Ссылка"></div>
					<div is="${prefix}-group" label="Почта">
						<div is="${prefix}-item" value="mail" text="Письмо"></div>
					</div>
				</div>
			</div>
			<div is="${prefix}-checkbox" value="ruler" text="Линейка"></div>
		</span>`

		/** Секции элемента коротко: подпись группы (`null` — без группы) и значения пунктов. */
		const outline = (el: TMenuElementProps | TMenuSubmenuElementProps) =>
			(el.state.sections ?? []).map(({ group, items }) => [
				group === null ? null : (group.label ?? ''),
				items.map((item) => item.value),
			])

		it.each([
			['в порядке модуля меню', 'so-test-up', KINDS],
			['в обратном порядке', 'so-test-down', [...KINDS].reverse()],
		] as const)(
			'%s — секции меню и подменю в порядке документа',
			async (_order, prefix, kinds) => {
				document.body.innerHTML = markup(prefix)

				for (const [kind, extend, tag] of kinds) {
					defineElement(`${prefix}-${kind}`, extend(), tag)
				}

				// Ожившие при регистрации собираются микрозадачей позже
				await flush()
				await flush()

				const menu = document.querySelector(`[is="${prefix}-menu"]`)
				const submenu = document.querySelector(`[is="${prefix}-submenu"]`)

				if (!isMenu(menu) || !isSubmenu(submenu)) throw new Error('меню нет')

				expect(outline(menu)).toEqual([
					[null, ['new', 'grid']],
					['Сортировка', ['name', 'date']],
					['Правка', ['cut', 'share']],
					[null, ['ruler']],
				])
				expect(outline(submenu)).toEqual([
					[null, ['link']],
					['Почта', ['mail']],
				])
			},
		)
	})
})

/**
 * Контекстное меню — `open-on="contextmenu"`: в слоте `trigger` область, меню
 * вызывают над ней, и панель встаёт у точки вызова. Расчёт у точки —
 * `setup/__tests__/overlay.spec.ts`; здесь — что шаблон доводит точку от ядра
 * до якоря панели и что связка кнопки у области пуста.
 */
describe('контекстное меню', () => {
	const AREA = '<div slot="trigger" class="so-test-area" tabindex="0">Отчёт.pdf</div>'
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

		await flush()
	}

	it('у области связки кнопки нет, у панели — роль и id, но не имя от триггера', async () => {
		await render({ attrs: 'open-on="contextmenu"', trigger: AREA, props: { items: ITEMS } })

		expect(areaNode().hasAttribute('aria-haspopup')).toBe(false)
		expect(areaNode().hasAttribute('aria-expanded')).toBe(false)
		expect(areaNode().hasAttribute('aria-controls')).toBe(false)
		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().id).not.toBe('')
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('правая кнопка открывает меню у точки вызова, повторная — переставляет панель', async () => {
		await render({ attrs: 'open-on="contextmenu"', trigger: AREA, props: { items: ITEMS } })

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
		await render({ attrs: 'open-on="contextmenu"', trigger: AREA, props: { items: ITEMS } })

		await rightClick(120, 80)

		areaNode().dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }),
		)
		await flush()

		expect(isOpen()).toBe(false)
	})

	it('смена open-on на лету: у кнопки связка появляется, у области пропадает', async () => {
		const menu = await render({ props: { items: ITEMS } })

		expect(triggerNode().getAttribute('aria-haspopup')).toBe('menu')

		menu.openOn = 'contextmenu'
		await flush()

		expect(triggerNode().hasAttribute('aria-haspopup')).toBe(false)
		expect(triggerNode().hasAttribute('aria-controls')).toBe(false)
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)

		menu.openOn = 'press'
		await flush()

		expect(triggerNode().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(triggerNode().id)
	})
})

/**
 * Подменю — `<div is="so-menu-submenu">`: пункт меню, в котором стоит, и меню
 * своих пунктов. Переходы плагинов — `plugins/__tests__/menu-submenu.plugin.spec.ts`,
 * сборка через лифт — `setup/__tests__/menu-submenu.spec.ts`; здесь — что в
 * Web Components пункт входит в коллекцию меню над ним, а его пункты — в его
 * собственную, связки стоят на своих узлах, клавиши и нажатие ходят между
 * уровнями, а выбор в подменю закрывает всё меню.
 */
describe('подменю', () => {
	/** Строка пункта с подменю — узел с ролью у пункта по тексту, на любом уровне. */
	const submenuRow = (text: string): HTMLElement => {
		const row = [...document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]')].find(
			(candidate) => candidate.textContent?.trim().startsWith(text),
		)

		if (!row) throw new Error(`строки подменю «${text}» нет`)

		return row
	}

	const shareRow = () => submenuRow('Поделиться')
	const rootPanel = () => panelOf(triggerNode())
	const subPanel = () => panelOf(shareRow())
	const share = () => part('[is="so-menu-submenu"]', isSubmenu)

	/** Меню «Изменить · Поделиться → (Ссылка, Почта) · Удалить» разметкой. */
	const MARKUP = (share = '') => `<div is="so-menu-item" value="edit" text="Изменить"></div>
		<div is="so-menu-submenu" value="share" text="Поделиться" ${share}>
			<div is="so-menu-item" value="link" text="Ссылка"></div>
			<div is="so-menu-item" value="mail" text="Почта"></div>
		</div>
		<div is="so-menu-item" value="remove" text="Удалить"></div>`

	/** Открыть меню клавишей и спуститься на «Поделиться». */
	async function openOnShare(): Promise<void> {
		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')
		await press(rowOf('Изменить', rootPanel()), 'ArrowDown')
	}

	it('строка — пункт меню, панель подменю — меню с именем от строки, в body и скрыта', async () => {
		await render({ content: MARKUP() })

		const row = shareRow()

		expect(row.getAttribute('role')).toBe('menuitem')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-expanded')).toBe('false')
		expect(row.id).not.toBe('')
		expect(subPanel().getAttribute('role')).toBe('menu')
		expect(subPanel().getAttribute('aria-labelledby')).toBe(row.id)
		expect(subPanel().getAttribute('tabindex')).toBe('-1')
		expect(subPanel().parentElement).toBe(document.body)
		expect(subPanel()).not.toBe(rootPanel())
		expect(shown(subPanel())).toBe(false)
		// Стрелка у конца строки — немая: подменю объявляет aria-haspopup
		expect(find('.so-menu-item__arrow', row).getAttribute('aria-hidden')).toBe('true')
		expect(row.querySelector('.so-menu-item__arrow .so-icon')?.getAttribute('icon')).toBe(
			'arrowRight',
		)
		// Строка — первой в корне пункта, корень пункта — якорь панели
		expect(share().firstElementChild).toBe(row)
		expect(share().contains(subPanel())).toBe(false)
	})

	/**
	 * Свой `id` пункта с подменю — его вход: атрибут разметки база берёт пропом
	 * первой сборки и снимает с корня пункта, и на строку `id` встаёт из набора
	 * пункта — панель подменю ссылается на него, узел с ним один. `id` панели
	 * своего входа не имеет и остаётся формулой. Из кода — `ctrl.id`: строка и
	 * панель идут за ним.
	 */
	it('свой id подменю — на строке, панель ссылается на него и идёт за его сменой', async () => {
		await render({ content: MARKUP('id="menu-share"') })

		expect(shareRow().id).toBe('menu-share')
		expect(subPanel().getAttribute('aria-labelledby')).toBe('menu-share')
		expect(document.querySelectorAll('[id="menu-share"]')).toHaveLength(1)
		expect(share().hasAttribute('id')).toBe(false)

		const ctrl = share().ctrl

		if (!ctrl) throw new Error('у подменю нет ctrl')

		ctrl.id = 'menu-send'
		await flush()

		expect(shareRow().id).toBe('menu-send')
		expect(subPanel().getAttribute('aria-labelledby')).toBe('menu-send')
	})

	it('пункт входит в меню над ним, его пункты — в его собственное меню', async () => {
		const menu = await render({ content: MARKUP() })

		expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
		expect(texts(subPanel())).toEqual(['Ссылка', 'Почта'])
		expect(menu.state.items?.map((item) => item.value)).toEqual(['edit', 'share', 'remove'])
		expect(share().state.items?.map((item) => item.value)).toEqual(['link', 'mail'])

		// Стрелки меню ходят по его пунктам: из «Поделиться» вниз — «Удалить»
		await openOnShare()

		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Удалить', rootPanel()))
	})

	it('→ открывает подменю на первом пункте, ← закрывает уровень — фокус на строке', async () => {
		await render({ content: MARKUP() })

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(shown(subPanel())).toBe(true)
		expect(shareRow().getAttribute('aria-expanded')).toBe('true')
		expect(document.activeElement).toBe(rowOf('Ссылка', subPanel()))
		// Пункт подменю горит, пока открыта его панель
		expect(share().dataset['open']).toBe('true')

		await press(rowOf('Ссылка', subPanel()), 'ArrowLeft')

		expect(shown(subPanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(shareRow())
	})

	it('Escape закрывает один уровень, следующий — меню', async () => {
		await render({ content: MARKUP() })

		await openOnShare()
		await press(shareRow(), 'Enter')
		await press(rowOf('Ссылка', subPanel()), 'Escape')

		expect(shown(subPanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'Escape')

		expect(shown(rootPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('клик по строке открывает подменю, повторный его не закрывает', async () => {
		await render({ content: MARKUP() })

		await open()
		await click(shareRow())

		expect(shown(subPanel())).toBe(true)

		await click(shareRow())

		expect(shown(subPanel())).toBe(true)
	})

	it('выбор в подменю закрывает всё меню, сообщает choose меню и подменю, фокус — на триггер', async () => {
		const menu = await render({ content: MARKUP() })
		const root = chosenOf(menu)
		const nested = chosenOf(share())

		await openOnShare()
		await press(shareRow(), 'ArrowRight')
		await click(rowOf('Почта', subPanel()))
		await nextFrame()

		expect(root).toEqual(['mail'])
		expect(nested).toEqual(['mail'])
		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Tab в подменю закрывает всё меню и ведёт к остановке за ним', async () => {
		await render({ content: MARKUP(), around: true })

		await openOnShare()
		await press(shareRow(), 'ArrowRight')
		await press(rowOf('Ссылка', subPanel()), 'Tab')

		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(document.activeElement).toBe(find('.so-test-after'))
	})

	it('open свойством подменю — в обе стороны, so:change:open у подменю', async () => {
		await render({ content: MARKUP() })

		const opens = collect(share(), 'so:change:open')

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(share().open).toBe(true)
		expect(opens).toEqual([true])

		share().open = false
		await flush()

		expect(shown(subPanel())).toBe(false)
	})

	/**
	 * Корень подменю только прячется, а его панель увезена в `body`: она
	 * прячется по признаку поддерева подменю, иначе открытая панель осталась бы
	 * на виду без своей строки.
	 */
	it('rendered=false у подменю прячет его корень и открытую панель', async () => {
		await render({ content: MARKUP() })

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		share().rendered = false
		await flush()

		expect(share().style.display).toBe('none')
		expect(shown(subPanel())).toBe(false)
		expect(share().open).toBe(true)

		share().rendered = true
		await flush()

		expect(shown(subPanel())).toBe(true)
	})

	/**
	 * Панель подменю увезена в `body` отдельно от панели меню, и скрытый корень
	 * меню до неё не доходит. У Vue `v-if` корня меню снимает всё поддерево — с
	 * подменю и его панелью, — а у Web Components подменю прячет свою панель по
	 * признаку поддерева меню над ним. Снова отрисованное меню — обе панели на
	 * виду, как и были.
	 */
	it('rendered=false у меню прячет и открытую панель подменю, rendered=true — обе снова на виду', async () => {
		const menu = await render({ content: MARKUP() })

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(shown(subPanel())).toBe(true)

		menu.rendered = false
		await flush()

		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(subPanel().parentElement).toBe(document.body)
		expect(share().open).toBe(true)

		menu.rendered = true
		await flush()

		expect(shown(rootPanel())).toBe(true)
		expect(shown(subPanel())).toBe(true)
	})

	it('размер меню — у панели подменю и у его пунктов', async () => {
		await render({ attrs: 'size="lg"', content: MARKUP() })

		expect(subPanel().classList).toContain('so-menu__panel')
		expect(subPanel().classList).toContain('so-menu__panel--size-lg')
		expect(rowOf('Ссылка', subPanel()).parentElement?.classList).toContain(
			'so-menu-item--size-lg',
		)
	})

	/** Модификаторы варианта узла. */
	const variantsOf = (node: Element | null | undefined) =>
		[...(node?.classList ?? [])].filter((cls) => cls.includes('--variant-'))

	/**
	 * Панель подменю телепортирована, и класс панели меню до её пунктов не
	 * доходит: вариант меню она несёт своим модификатором, а свой вариант
	 * подменю сильнее. Строкам вариант меню не пишется.
	 */
	it('вариант меню — у панели подменю, свой вариант подменю сильнее; смена на лету', async () => {
		const menu = await render({ attrs: 'variant="brand"', content: MARKUP() })

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
		expect(variantsOf(share())).toEqual([])
		expect(variantsOf(rowOf('Ссылка', subPanel()).parentElement)).toEqual([])

		menu.variant = 'danger'
		await flush()

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-danger'])

		share().variant = 'brand'
		await flush()

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
		expect(variantsOf(share())).toEqual(['so-menu-item--variant-brand'])

		// Под своим вариантом подменю смена у меню панели не трогает
		menu.variant = undefined
		await flush()

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])

		share().variant = undefined
		await flush()

		expect(variantsOf(subPanel())).toEqual([])
	})

	it('пункты подменю данными (items) — с группами и копиями образцов, как у меню', async () => {
		await render({
			content: `<div is="so-menu-submenu" value="share" text="Поделиться">
				<template slot="item">Пункт подменю</template>
			</div>`,
		})

		share().items = [
			{ value: 'link', text: 'Ссылка' },
			{ value: 'mail', text: 'Почта', _: { group: 'send' } },
		]
		share().groups = [{ key: 'send', label: 'Отправить' }]
		await flush()
		await flush()

		expect(texts(subPanel())).toEqual(['Пункт подменю', 'Пункт подменю'])
		expect(find('.so-menu-group__label', subPanel()).textContent).toBe('Отправить')
		expect(share().state.items?.map((item) => item.value)).toEqual(['link', 'mail'])
	})

	/**
	 * Разделители между секциями своих пунктов подменю просит само: свойство
	 * своё, с умолчанием меню, и от меню над ним не переходит.
	 */
	it('разделители секций подменю — свои: по умолчанию есть, groupSeparators снимает их только у него', async () => {
		await render({
			props: { groupSeparators: false },
			content: '<div is="so-menu-submenu" value="share" text="Поделиться"></div>',
		})

		share().items = [
			{ value: 'link', text: 'Ссылка' },
			{ value: 'mail', text: 'Почта', _: { group: 'send' } },
		]
		share().groups = [{ key: 'send', label: 'Отправить' }]
		await flush()
		await flush()

		// Меню своих разделителей не просит, а подменю — по своему умолчанию
		expect(subPanel().querySelectorAll('.so-menu-separator')).toHaveLength(1)

		share().groupSeparators = false
		await flush()

		expect(subPanel().querySelector('.so-menu-separator')).toBeNull()
	})

	/**
	 * Подменю из данных: пункт `items` с вложенным `items` меню рисует
	 * `<div is="so-menu-submenu">` из записи коллекции (`ctrl`, `engine`), а
	 * подменю так же рисует свои — уровней сколько угодно.
	 */
	describe('подменю из данных', () => {
		/**
		 * То же меню, что разметкой выше, — «Изменить · Поделиться → (Ссылка,
		 * Почта, Мессенджеры → Telegram) · Удалить», — данными, с третьим уровнем.
		 */
		const DATA: IMenuItemSource[] = [
			{ value: 'edit', text: 'Изменить' },
			{
				value: 'share',
				text: 'Поделиться',
				items: [
					{ value: 'link', text: 'Ссылка' },
					{ value: 'mail', text: 'Почта' },
					{
						value: 'messengers',
						text: 'Мессенджеры',
						items: [{ value: 'telegram', text: 'Telegram' }],
					},
				],
			},
			{ value: 'remove', text: 'Удалить' },
		]

		it('вариант меню — у панелей подменю из данных всех уровней', async () => {
			const menu = await render({ attrs: 'variant="brand"', props: { items: DATA } })

			const messengers = () => panelOf(submenuRow('Мессенджеры'))

			expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
			expect(variantsOf(messengers())).toEqual(['so-menu__panel--variant-brand'])

			menu.variant = 'danger'
			await flush()

			expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-danger'])
			expect(variantsOf(messengers())).toEqual(['so-menu__panel--variant-danger'])
		})

		it('пункт с items — подменю: строка объявляет меню, панель — его пункты, третий уровень — тоже', async () => {
			await render({ props: { items: DATA } })

			const messengers = submenuRow('Мессенджеры')

			expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
			expect(shareRow().getAttribute('role')).toBe('menuitem')
			expect(shareRow().getAttribute('tabindex')).toBe('-1')
			expect(shareRow().getAttribute('aria-expanded')).toBe('false')
			expect(subPanel().getAttribute('role')).toBe('menu')
			expect(subPanel().getAttribute('aria-labelledby')).toBe(shareRow().id)
			expect(subPanel().parentElement).toBe(document.body)
			expect(shown(subPanel())).toBe(false)
			expect(texts(subPanel())).toEqual(['Ссылка', 'Почта', 'Мессенджеры'])
			// Третий уровень подменю рисует само
			expect(subPanel().contains(messengers)).toBe(true)
			expect(texts(panelOf(messengers))).toEqual(['Telegram'])
			expect(panelOf(messengers).getAttribute('aria-labelledby')).toBe(messengers.id)
		})

		it('клик по строке открывает подменю из данных, повторный его не закрывает', async () => {
			await render({ props: { items: DATA } })

			await open()
			await click(shareRow())

			expect(shown(subPanel())).toBe(true)
			expect(shareRow().getAttribute('aria-expanded')).toBe('true')

			await click(shareRow())

			expect(shown(subPanel())).toBe(true)
		})

		it('→ открывает подменю из данных на первом пункте, ← закрывает уровень — фокус на строке', async () => {
			await render({ props: { items: DATA } })

			await openOnShare()
			await press(shareRow(), 'ArrowRight')

			expect(shown(subPanel())).toBe(true)
			expect(document.activeElement).toBe(rowOf('Ссылка', subPanel()))

			await press(rowOf('Ссылка', subPanel()), 'ArrowLeft')

			expect(shown(subPanel())).toBe(false)
			expect(shown(rootPanel())).toBe(true)
			expect(document.activeElement).toBe(shareRow())
		})

		it('клавиши и выбор на втором уровне: choose — корню, меню закрыто целиком, фокус — на триггер', async () => {
			const menu = await render({ props: { items: DATA } })
			const chosen = chosenOf(menu)

			await openOnShare()
			await press(shareRow(), 'ArrowRight')
			await press(rowOf('Ссылка', subPanel()), 'ArrowDown')

			expect(document.activeElement).toBe(rowOf('Почта', subPanel()))

			await press(rowOf('Почта', subPanel()), 'Enter')

			expect(chosen).toEqual(['mail'])
			expect(shown(rootPanel())).toBe(false)
			expect(shown(subPanel())).toBe(false)
			expect(document.activeElement).toBe(triggerNode())
		})

		it('третий уровень: → открывает его, выбор доходит до корня и закрывает все уровни', async () => {
			const menu = await render({ props: { items: DATA } })
			const chosen = chosenOf(menu)

			await openOnShare()
			await press(shareRow(), 'ArrowRight')
			await press(rowOf('Ссылка', subPanel()), 'End')

			const messengers = submenuRow('Мессенджеры')
			const deep = panelOf(messengers)

			expect(document.activeElement).toBe(messengers)

			await press(messengers, 'ArrowRight')

			expect(shown(deep)).toBe(true)
			expect(document.activeElement).toBe(rowOf('Telegram', deep))

			await press(rowOf('Telegram', deep), 'Enter')

			expect(chosen).toEqual(['telegram'])
			expect([shown(rootPanel()), shown(subPanel()), shown(deep)]).toEqual([
				false,
				false,
				false,
			])
			expect(document.activeElement).toBe(triggerNode())
		})

		it('патч по trackBy: строка, панель и пункты подменю — те же узлы, текст и состав — новые', async () => {
			const menu = await render({
				props: { items: DATA, trackBy: (item: { value?: unknown }) => item.value },
			})

			const row = shareRow()
			const panel = subPanel()
			const link = rowOf('Ссылка', panel)

			menu.items = [
				{ value: 'edit', text: 'Изменить' },
				{
					value: 'share',
					text: 'Отправить',
					items: [
						{ value: 'link', text: 'Ссылкой' },
						{ value: 'sms', text: 'СМС' },
					],
				},
				{ value: 'remove', text: 'Удалить' },
			]
			await flush()
			await flush()

			expect(row.isConnected).toBe(true)
			expect(row.textContent?.trim()).toBe('Отправить')
			expect(panelOf(row)).toBe(panel)
			expect(rowOf('Ссылкой', panel)).toBe(link)
			expect(texts(panel)).toEqual(['Ссылкой', 'СМС'])
		})

		/**
		 * Образцы `item-*` меню — одни на все уровни: подменю из данных получает
		 * копии в слоты своей строки и образцы своих пунктов под теми же
		 * именами. Данные копия берёт у ближайшего пункта (`el.ctrl`).
		 */
		it('образцы пунктов из данных — одни на все уровни: значок, текст, строка и стрелка подменю', async () => {
			await render({
				props: { items: DATA },
				content: `<template slot="item-leading"><i class="so-test-icon"></i></template>
					<template slot="item">Действие</template>
					<template slot="item-header">Подменю</template>
					<template slot="item-arrow-icon"><b class="so-test-arrow"></b></template>`,
			})

			// Строки подменю — по месту: копия `item-header` заменила текст у каждой
			const share = rows(rootPanel())[1]
			const sharePanel = panelOf(share)
			const messengers = rows(sharePanel)[2]

			// Действия — `item`, строки подменю — `item-header`, на каждом уровне
			expect(rows(rootPanel()).map(labelOf)).toEqual(['Действие', 'Подменю', 'Действие'])
			expect(rows(sharePanel).map(labelOf)).toEqual(['Действие', 'Действие', 'Подменю'])
			expect(rows(panelOf(messengers)).map(labelOf)).toEqual(['Действие'])
			// Данные копия берёт у ближайшего пункта: у подменю — свой инстанс
			const item = messengers.parentElement

			expect(isSubmenu(item) ? item.ctrl?.value : undefined).toBe('messengers')
			// Значок — у строк обоих видов, стрелка — у подменю, своя иконка — вон
			expect(rows(sharePanel).every((row) => row.querySelector('.so-test-icon'))).toBe(true)
			expect(messengers.querySelector('.so-menu-item__arrow .so-test-arrow')).not.toBeNull()
			expect(messengers.querySelector('.so-menu-item__arrow .so-icon')).toBeNull()
			// Образцы в подменю в документ не выводятся
			expect(document.querySelector('[is="so-menu-submenu"] template')).toBeNull()
		})

		/**
		 * Scope у слотов нет: копия `item-content` — одна на все подменю из
		 * данных, и пункты разметкой получает каждое. Пустой образец — как не
		 * заданный: подменю рисует свои пункты из данных.
		 */
		it('item-content — пункты подменю разметкой у каждого подменю из данных; пустой — свои из данных', async () => {
			const menu = await render({
				props: { items: [{ value: 'export', text: 'Экспорт', items: [] }] },
				content: `<template slot="item-content"><div is="so-menu-item" value="pdf" text="PDF"></div><div is="so-menu-item" value="png" text="PNG"></div></template>`,
			})
			const chosen = chosenOf(menu)
			const exportRow = submenuRow('Экспорт')

			expect(texts(panelOf(exportRow))).toEqual(['PDF', 'PNG'])

			// Пункты разметки — пункты этого подменю: стрелки и выбор идут по ним
			triggerNode().focus()
			await press(triggerNode(), 'ArrowDown')
			await press(exportRow, 'ArrowRight')

			expect(document.activeElement).toBe(rowOf('PDF', panelOf(exportRow)))

			await press(rowOf('PDF', panelOf(exportRow)), 'ArrowDown')
			await press(rowOf('PNG', panelOf(exportRow)), 'Enter')

			expect(chosen).toEqual(['png'])
			expect(shown(rootPanel())).toBe(false)

			document.body.innerHTML = ''

			await render({
				props: {
					items: [
						{
							value: 'export',
							text: 'Экспорт',
							items: [{ value: 'csv', text: 'CSV' }],
						},
					],
				},
				content: '<template slot="item-content"></template>',
			})

			expect(texts(panelOf(submenuRow('Экспорт')))).toEqual(['CSV'])
		})

		/**
		 * Без `trackBy` замена `items` пересобирает меню: подменю — новый пункт с
		 * новым движком, и строку пункта петля строит заново — ключ `uid`.
		 * Пункты копии `item-content` входят в движок нового подменю: вложенный
		 * состав на месте свойства без `trackBy` не пишут, и снять их нечему.
		 */
		it('item-content и замена items без trackBy: подменю новое, пункты разметки — в его коллекции, стрелки и выбор идут по ним', async () => {
			const engine = createEngineMenu()
			const menu = await render({
				props: { engine, items: [{ value: 'export', text: 'Экспорт', items: [] }] },
				content: `<template slot="item-content"><div is="so-menu-item" value="pdf" text="PDF"></div><div is="so-menu-item" value="png" text="PNG"></div></template>`,
			})
			const chosen = chosenOf(menu)
			const values = () =>
				submenuOf(engine, 'export').engine.extensions.batch.items.map((item) => item.value)
			const replaced = submenuOf(engine, 'export')

			expect(values()).toEqual(['pdf', 'png'])

			menu.items = [{ value: 'export', text: 'Выгрузка', items: [] }]
			await flush()
			await flush()
			await nextFrame()

			// Новый пункт и новый движок; пункты разметки — в нём, прежний пуст
			const row = submenuRow('Выгрузка')

			expect(submenuOf(engine, 'export').ctrl).not.toBe(replaced.ctrl)
			expect(submenuOf(engine, 'export').engine).not.toBe(replaced.engine)
			expect(values()).toEqual(['pdf', 'png'])
			expect(replaced.engine.extensions.batch.items).toEqual([])
			expect(texts(panelOf(row))).toEqual(['PDF', 'PNG'])

			triggerNode().focus()
			await press(triggerNode(), 'ArrowDown')
			await press(row, 'ArrowRight')

			expect(document.activeElement).toBe(rowOf('PDF', panelOf(row)))

			await press(rowOf('PDF', panelOf(row)), 'ArrowDown')
			await press(rowOf('PNG', panelOf(row)), 'Enter')

			expect(chosen).toEqual(['png'])
			expect(shown(rootPanel())).toBe(false)
		})

		/** Запись подменю из данных по значению пункта. */
		function submenuOf(engine: TMenuCollection, value: string) {
			const { batch, submenus } = engine.extensions
			const item = batch.items.find((candidate) => candidate.value === value)
			const entry = item ? submenus.entries.get(item) : undefined

			if (!entry) throw new Error(`подменю «${value}» нет`)

			return entry
		}

		/**
		 * Подменю, переехавшее в другую секцию, петля одной группы снимает, а
		 * петля другой строит заново — с той же записью: тем же пунктом и тем же
		 * движком. Владелец движка подменю остаётся на месте.
		 */
		it('переезд в другую группу: владелец движка подменю на месте, размер меню — у его пунктов, выбор — до корня', async () => {
			const engine = createEngineMenu()
			const nested: IMenuItemSource[] = [
				{ value: 'link', text: 'Ссылка' },
				{ value: 'mail', text: 'Почта' },
			]
			const items: TCollectionEngineItemSource<IMenuItemSource>[] = [
				{ value: 'share', text: 'Поделиться', items: nested, _: { group: 'g' } },
				{ value: 'remove', text: 'Удалить' },
			]
			const sections = () => engine.extensions.group.sections.map((section) => section.key)

			engine.extensions.batch.trackBy = (item) => item.value

			const menu = await render({
				attrs: 'size="lg"',
				props: { engine, items, groups: [{ key: 'g' }] },
			})
			const chosen = chosenOf(menu)
			const entry = submenuOf(engine, 'share')
			const row = shareRow()

			expect(sections()).toEqual(['group:g', 'free'])
			expect(entry.engine.options.get('owner')).toBe(entry.ctrl)

			// Патч снял группу: подменю переезжает в секцию без группы
			menu.items = [
				{ value: 'share', text: 'Поделиться', items: nested, _: { group: undefined } },
				{ value: 'remove', text: 'Удалить' },
			]
			await flush()
			await flush()
			await nextFrame()

			// Построено заново — новые узлы, та же запись
			expect(sections()).toEqual(['free'])
			expect(row.isConnected).toBe(false)
			expect(submenuOf(engine, 'share')).toBe(entry)
			expect(entry.engine.options.get('owner')).toBe(entry.ctrl)

			// Размер меню доходит до пунктов подменю через его владельца
			menu.size = 'sm'
			await flush()

			expect(rowOf('Ссылка', subPanel()).parentElement?.classList).toContain(
				'so-menu-item--size-sm',
			)

			await open()
			await click(shareRow())
			await click(rowOf('Почта', subPanel()))
			await nextFrame()

			expect(chosen).toEqual(['mail'])
			expect(shown(rootPanel())).toBe(false)
			expect(shown(subPanel())).toBe(false)
		})
	})
})

/**
 * Меню, переставленное одной операцией: якорь панели остаётся в его корне и
 * из документа не уходит, а меню собирается заново — новый фасад и новая
 * коллекция. Панель с пунктами идёт за ним сразу, без ожидания: возвращается к
 * якорю, собирается после меню и снова уезжает в `body`, а пункты входят в
 * коллекцию новой сборки. Подменю в панели — так же, уровнем ниже. Без этого
 * стрелки с триггера и наведение до пунктов не доходили.
 */
describe('перестановка', () => {
	/** Строка пункта с подменю. */
	const shareRow = () => find('.so-menu-item > [aria-haspopup="menu"]')
	const rootPanel = () => panelOf(triggerNode())
	const subPanel = () => panelOf(shareRow())
	const share = () => part('[is="so-menu-submenu"]', isSubmenu)

	/** Меню «Изменить · Поделиться → (Ссылка, Почта) · Удалить» разметкой. */
	const MARKUP = `<div is="so-menu-item" value="edit" text="Изменить"></div>
		<div is="so-menu-submenu" value="share" text="Поделиться">
			<div is="so-menu-item" value="link" text="Ссылка"></div>
			<div is="so-menu-item" value="mail" text="Почта"></div>
		</div>
		<div is="so-menu-item" value="remove" text="Удалить"></div>`

	it('пункты — в коллекции новой сборки сразу, панели — в body, по одной', async () => {
		const menu = await render({ content: MARKUP })

		document.body.appendChild(document.createElement('section')).appendChild(menu)

		expect(menu.state.items?.map((item) => item.value)).toEqual(['edit', 'share', 'remove'])
		expect(share().state.items?.map((item) => item.value)).toEqual(['link', 'mail'])
		expect(rootPanel().parentElement).toBe(document.body)
		expect(subPanel().parentElement).toBe(document.body)
		expect(menu.contains(rootPanel())).toBe(false)
		expect(document.querySelectorAll('.so-menu__panel')).toHaveLength(2)
	})

	it('↓ с триггера — на первый пункт, стрелками до подменю, → открывает его на первом пункте', async () => {
		const menu = await render({ content: MARKUP })

		document.body.appendChild(document.createElement('section')).appendChild(menu)
		// Слушатели плагинов новой сборки — кадром позже
		await nextFrame()

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Изменить', rootPanel()))

		await press(rowOf('Изменить', rootPanel()), 'ArrowDown')

		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'ArrowRight')

		expect(shown(subPanel())).toBe(true)
		expect(document.activeElement).toBe(rowOf('Ссылка', subPanel()))
	})

	/**
	 * Пункты из данных строит первая отрисовка новой сборки — в панели, которая
	 * уже вернулась к якорю: их подключения встают в очередь за панелью.
	 */
	it('пункты из данных — в коллекции новой сборки, ↓ с триггера — на первый', async () => {
		const menu = await render({ props: { items: ITEMS } })

		document.body.appendChild(document.createElement('section')).appendChild(menu)

		expect(menu.state.items?.map((item) => item.value)).toEqual(['edit', 'remove'])
		expect(rows()).toHaveLength(2)
		expect(document.querySelectorAll('.so-menu__panel')).toHaveLength(1)

		await nextFrame()

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Изменить'))
	})

	it('клик строки пункта — choose новой сборки меню', async () => {
		const menu = await render({ content: MARKUP })

		document.body.appendChild(document.createElement('section')).appendChild(menu)
		await nextFrame()

		const chosen = chosenOf(menu)

		await open()
		await click(rowOf('Удалить', rootPanel()))

		expect(chosen).toEqual(['remove'])
		expect(isOpen()).toBe(false)
	})

	it('снятое меню уводит панели из body сразу, без ожидания', async () => {
		const menu = await render({ content: MARKUP })

		menu.remove()

		expect(document.querySelector('.so-menu__panel')).toBeNull()
		expect(document.querySelector('.so-menu-item')).toBeNull()
	})
})

/**
 * Пункт с панелью — `<div is="so-menu-popover-item">`: строка открывает сбоку
 * немодальную панель-диалог с любым содержимым. Переходы плагинов —
 * `plugins/__tests__/menu-popover-item.plugin.spec.ts`; здесь — что в Web
 * Components пункт входит в коллекцию меню, связки стоят на своих узлах,
 * панель уехала в `body` и открывается нажатием и клавишами, фокус ходит
 * между меню и панелью, а содержимое панели меню не закрывает.
 */
describe('пункт с панелью', () => {
	/** Строка пункта с панелью — узел с ролью у пункта «Срок». */
	const dueRow = () => find('.so-menu-item > [aria-haspopup="dialog"]')
	const rootPanel = () => panelOf(triggerNode())
	const duePanel = () => panelOf(dueRow())
	const due = () =>
		part(
			'[is="so-menu-popover-item"]',
			(node): node is TMenuPopoverItemElementProps =>
				node?.getAttribute('is') === 'so-menu-popover-item',
		)

	/** Меню «Изменить · Срок → (Раньше, Позже) · Поделиться → (Ссылка)» разметкой. */
	const MARKUP = (attrs = '') => `<div is="so-menu-item" value="edit" text="Изменить"></div>
		<div is="so-menu-popover-item" value="due" text="Срок" ${attrs}>
			<button class="so-test-earlier">Раньше</button>
			<button class="so-test-later">Позже</button>
		</div>
		<div is="so-menu-submenu" value="share" text="Поделиться">
			<div is="so-menu-item" value="link" text="Ссылка"></div>
		</div>`

	/** Открыть меню клавишей и спуститься на «Срок». */
	async function openOnDue(): Promise<void> {
		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')
		await press(rowOf('Изменить'), 'ArrowDown')
	}

	it('строка — пункт меню, панель — диалог с именем от строки, в body и скрыта', async () => {
		await render({ content: MARKUP() })

		const row = dueRow()

		expect(row.getAttribute('role')).toBe('menuitem')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-expanded')).toBe('false')
		expect(row.id).not.toBe('')
		expect(duePanel().getAttribute('role')).toBe('dialog')
		expect(duePanel().getAttribute('aria-labelledby')).toBe(row.id)
		expect(duePanel().getAttribute('tabindex')).toBe('-1')
		expect(duePanel().classList).toContain('so-menu-item__panel')
		expect(duePanel().parentElement).toBe(document.body)
		expect(duePanel()).not.toBe(rootPanel())
		expect(shown(duePanel())).toBe(false)
		// Содержимое — в своей обёртке, без lazyMount в документе сразу
		expect(duePanel().querySelector('.so-menu-item__content .so-test-earlier')).not.toBeNull()
		// Стрелка у конца строки — немая: о панели говорит aria-haspopup
		expect(find('.so-menu-item__arrow', row).getAttribute('aria-hidden')).toBe('true')
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).not.toBeNull()
		// Пункт — в коллекции меню, рядом с остальными
		expect(rows().map((candidate) => candidate.textContent?.trim())).toEqual([
			'Изменить',
			'Срок',
			'Поделиться',
		])
	})

	it('клик по строке открывает панель — фокус в ней, повторный клик её не закрывает', async () => {
		await render({ content: MARKUP() })

		await open()
		await click(dueRow())
		await nextFrame()

		expect(shown(duePanel())).toBe(true)
		expect(dueRow().getAttribute('aria-expanded')).toBe('true')
		expect(due().dataset['open']).toBe('true')
		expect(document.activeElement).toBe(find('.so-test-earlier'))

		await click(dueRow())

		expect(shown(duePanel())).toBe(true)
		expect(shown(rootPanel())).toBe(true)
	})

	it.each(['ArrowRight', 'Enter'])(
		'%s на строке открывает панель — фокус на её первой остановке, меню открыто',
		async (key) => {
			await render({ content: MARKUP() })

			await openOnDue()

			expect(document.activeElement).toBe(dueRow())

			await press(dueRow(), key)

			expect(shown(duePanel())).toBe(true)
			expect(shown(rootPanel())).toBe(true)
			expect(document.activeElement).toBe(find('.so-test-earlier'))
		},
	)

	it('Escape в панели закрывает её — фокус на строке; следующий Escape — меню', async () => {
		await render({ content: MARKUP() })

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		await press(find('.so-test-earlier'), 'Escape')

		expect(shown(duePanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(dueRow())

		await press(dueRow(), 'Escape')

		expect(shown(rootPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Shift+Tab с первой остановки — на строку, Tab со строки — снова в панель', async () => {
		await render({ content: MARKUP() })

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		await press(find('.so-test-earlier'), 'Tab', { shiftKey: true })

		expect(document.activeElement).toBe(dueRow())
		expect(shown(duePanel())).toBe(true)

		await press(dueRow(), 'Tab')

		expect(document.activeElement).toBe(find('.so-test-earlier'))
	})

	it('стрелка к концу строки открытого пункта ведёт фокус в его панель', async () => {
		await render({ content: MARKUP() })

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		// Фокус на строке, панель открыта — как после открытия наведением
		await press(find('.so-test-earlier'), 'Tab', { shiftKey: true })

		expect(document.activeElement).toBe(dueRow())

		const event = await press(dueRow(), 'ArrowRight')

		expect(event.defaultPrevented).toBe(true)
		expect(shown(duePanel())).toBe(true)
		expect(document.activeElement).toBe(find('.so-test-earlier'))
	})

	it('Tab с последней остановки закрывает всё меню и ведёт к остановке за ним', async () => {
		await render({ content: MARKUP(), around: true })

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		find('.so-test-later').focus()
		await press(find('.so-test-later'), 'Tab')

		expect(shown(rootPanel())).toBe(false)
		expect(shown(duePanel())).toBe(false)
		expect(document.activeElement).toBe(find('.so-test-after'))
	})

	it('нажатие в содержимом панели меню не закрывает и не выбирает пункт', async () => {
		const menu = await render({ content: MARKUP() })
		const chosen = chosenOf(menu)

		await open()
		await click(dueRow())
		await nextFrame()
		await click(find('.so-test-later'))

		expect(shown(rootPanel())).toBe(true)
		expect(shown(duePanel())).toBe(true)
		expect(chosen).toEqual([])
	})

	it('открыта одна панель: пункт с панелью закрывает подменю, и подменю — его', async () => {
		await render({ content: MARKUP() })

		const shareRow = () => find('.so-menu-item > [aria-haspopup="menu"]')

		await open()
		await click(shareRow())
		await click(dueRow())

		expect(shown(duePanel())).toBe(true)
		expect(shown(panelOf(shareRow()))).toBe(false)

		await click(shareRow())

		expect(shown(duePanel())).toBe(false)
		expect(shown(panelOf(shareRow()))).toBe(true)
	})

	it('lazy-mount: содержимое — с первого открытия, закрытие его не снимает', async () => {
		await render({ content: MARKUP('lazy-mount') })

		expect(document.querySelector('.so-test-earlier')).toBeNull()
		expect(duePanel().querySelector('.so-menu-item__content')).not.toBeNull()

		await open()
		await click(dueRow())

		expect(duePanel().querySelector('.so-test-earlier')).not.toBeNull()

		await press(find('.so-test-earlier'), 'Escape')

		expect(shown(duePanel())).toBe(false)
		expect(duePanel().querySelector('.so-test-earlier')).not.toBeNull()
	})

	it('open свойством пункта — в обе стороны, so:change:open у пункта', async () => {
		await render({ content: MARKUP() })

		const opens = collect(due(), 'so:change:open')

		await openOnDue()
		await press(dueRow(), 'ArrowRight')

		expect(due().open).toBe(true)
		expect(opens).toEqual([true])

		due().open = false
		await flush()

		expect(shown(duePanel())).toBe(false)
	})

	/** Корень пункта только прячется, а его панель увезена в `body`: её прячет признак поддерева пункта. */
	it('rendered=false у пункта прячет его корень и открытую панель', async () => {
		await render({ content: MARKUP() })

		await openOnDue()
		await press(dueRow(), 'ArrowRight')

		due().rendered = false
		await flush()

		expect(due().style.display).toBe('none')
		expect(shown(duePanel())).toBe(false)
		expect(due().open).toBe(true)

		due().rendered = true
		await flush()

		expect(shown(duePanel())).toBe(true)
	})

	/**
	 * Панель пункта увезена в `body`, как панель подменю: скрытое меню прячет и
	 * её — пункт стоит в поддереве меню, и у Vue его снял бы `v-if` корня меню.
	 */
	it('rendered=false у меню прячет и открытую панель пункта, rendered=true — обе снова на виду', async () => {
		const menu = await render({ content: MARKUP() })

		await openOnDue()
		await press(dueRow(), 'ArrowRight')

		expect(shown(duePanel())).toBe(true)

		menu.rendered = false
		await flush()

		expect(shown(rootPanel())).toBe(false)
		expect(shown(duePanel())).toBe(false)
		expect(due().open).toBe(true)

		menu.rendered = true
		await flush()

		expect(shown(rootPanel())).toBe(true)
		expect(shown(duePanel())).toBe(true)
	})

	it('слоты строки: значок, свой текст и своя стрелка', async () => {
		await render({
			content: `<div is="so-menu-popover-item" value="due" text="Срок">
				<i slot="leading" class="so-test-icon"></i>
				<span slot="header">Срок сдачи</span>
				<b slot="arrow-icon" class="so-test-arrow"></b>
				Календарь
			</div>`,
		})

		const row = dueRow()

		expect(row.querySelector('.so-menu-item__icon .so-test-icon')).not.toBeNull()
		expect(find('.so-button__text', row).textContent).toBe('Срок сдачи')
		expect(row.querySelector('.so-menu-item__arrow .so-test-arrow')).not.toBeNull()
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).toBeNull()
		expect(find('.so-menu-item__content', duePanel()).textContent?.trim()).toBe('Календарь')
	})

	it('размер меню — у пункта с панелью, вариант — свой; у панели модификаторов нет', async () => {
		await render({ attrs: 'size="lg"', content: MARKUP('variant="danger"') })

		const item = dueRow().parentElement

		expect(item?.classList).toContain('so-menu-item--size-lg')
		expect(item?.classList).toContain('so-menu-item--variant-danger')
		// Содержимое панели красится само: размер и вариант меню ему ни к чему
		expect([...duePanel().classList].some((cls) => cls.includes('--size-'))).toBe(false)
	})
})

describe('типы', () => {
	it('пропсы фасада и своей коллекции — свойства элементов', () => {
		expectTypeOf<TMenuElementProps>().toHaveProperty('items')
		expectTypeOf<TMenuElementProps>().toHaveProperty('engine')
		expectTypeOf<TMenuElementProps>().toHaveProperty('openOn')
		expectTypeOf<TMenuSubmenuElementProps>().toHaveProperty('items')
		expectTypeOf<TMenuSubmenuElementProps>().toHaveProperty('engine')
		expectTypeOf<TMenuCheckboxItemElementProps['selected']>().toEqualTypeOf<
			boolean | undefined
		>()
	})

	it('состояние — вместе со свойствами фасада, у подменю — и своей коллекции', () => {
		expectTypeOf<TMenuElementProps['state']>().toHaveProperty('sections')
		expectTypeOf<TMenuSubmenuElementProps['state']>().toHaveProperty('sections')
		expectTypeOf<TMenuSubmenuElementProps['state']>().toHaveProperty('panelAria')
		expectTypeOf<TMenuCheckboxItemElementProps['state']>().toHaveProperty('selected')
	})
})
