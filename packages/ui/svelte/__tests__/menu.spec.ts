/**
 * Menu в Svelte — проводка целиком, на настоящей разметке.
 *
 * Модель проверяет ядро (`core/__tests__/menu.spec.ts`), клавиши, указатель и
 * фокус — плагины (`plugins/__tests__/menu.plugin.spec.ts`); здесь важно, что
 * они сходятся: панель телепортирована и помечена владельцем, роль и связки
 * стоят на своих узлах, пункты из данных и разметкой входят в коллекцию, клик
 * строки действия закрывает меню и сообщает `choose`, флажок отмечается и
 * меню не закрывает. Сценарии — те же, что у Vue (`ui/vue/__tests__/menu.spec.ts`)
 * и Solid, кроме глобального компонента приложения с именем подменю:
 * реестра компонентов у Svelte нет, и подменю рисует себя само, импортом
 * своего модуля. `v-model` у Svelte нет — открытость, отметку и значение
 * потребитель отдаёт пропом и слышит колбэком со значением (`onChangeOpen`,
 * `onChangeSelected`, `onChangeValue`).
 *
 * Своё у Svelte. Панель — отдельный корень, который `Teleport` монтирует в
 * `body` эффектом со всеми контекстами места: пункты в ней читают лифт меню и
 * входят в его коллекцию при своей инициализации — после эффекта, то есть
 * после `flushSync()`, которым монтирование кончается. Связка триггера
 * меняется на каждое открытие, а триггер — тот же узел: scope сниппет читает
 * геттером. Пункты из данных — по секциям, записи которых новые на каждую
 * смену, а их строки — те же узлы: петля по ключу секции. Сниппет
 * непрозрачен: заданный меню проброс слота стоит у каждого пункта из данных
 * вместо своего, и пустой — тоже. Подменю — три контекста на одном лифте
 * сборки (`useElevator`): фасад пункта берёт коллекцию меню над ним, фасад
 * меню опускает свою, и порядок сборки не важен — лифт сборки сторожит
 * `collection-elevator.spec.ts`.
 *
 * Раскладка и действия браузера — `playground/vue/browser/menu.spec.ts`.
 */

import { describe, it, expect, expectTypeOf, afterEach, vi } from 'vitest'
import { flushSync, type ComponentProps, type Snippet } from 'svelte'
import {
	createEngineMenu,
	type IMenuItem,
	type IMenuItemSource,
	type TCollectionEngineItemSource,
	type TComponentVariant,
	type TMenuCollection,
	type TMenuOpenOn,
	type TMenuRadioGroupValue,
} from '@soldy-ui/core'
import {
	Menu,
	MenuCheckboxItem,
	MenuGroup,
	MenuItem,
	MenuPopoverItem,
	MenuRadioGroup,
	MenuRadioItem,
	MenuSeparator,
	MenuSubmenu,
	type MenuCheckboxItemProps,
	type MenuGroupProps,
	type MenuItemProps,
	type MenuPopoverItemProps,
	type MenuProps,
	type MenuRadioGroupProps,
	type MenuRadioItemProps,
	type MenuSubmenuProps,
} from '@soldy-ui/svelte'
import Harness, { area, trigger } from './Menu.test.svelte'
import { contentOf, find, mount, nextFrame, type TMounted } from './mount'
import { reactiveProps } from './reactive-props.svelte'
import { scopeMarkup, scopeText } from './snippets.svelte'

afterEach(() => {
	vi.restoreAllMocks()
})

type THarnessProps = ComponentProps<typeof Harness>

/** Смонтировать меню и дождаться кадра: корень плагины получают через кадр. */
async function render(props: MenuProps): Promise<TMounted> {
	const mounted = mount(Menu, props)

	await nextFrame()

	return mounted
}

/** Смонтировать разметку обёртки и дождаться кадра. */
async function renderHarness(props: THarnessProps): Promise<TMounted> {
	const mounted = mount(Harness, props)

	await nextFrame()

	return mounted
}

/** Узел по селектору в документе: панели телепортированы мимо контейнера. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const triggerNode = () => node('.so-test-trigger')
const panel = () => node('.so-menu__panel')
const isOpen = () => panel().style.display !== 'none'
/** Строки пунктов по порядку — узлы с ролью. */
const rows = () => [...panel().querySelectorAll<HTMLElement>('[role^="menuitem"]')]

/** Строка пункта по тексту. */
function rowOf(text: string): HTMLElement {
	const row = rows().find((candidate) => candidate.textContent?.trim().startsWith(text))

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Клик мышью целиком: нажатие, фокус от `mousedown`, клик. */
function click(target: HTMLElement): void {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	target.focus()
	target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
	flushSync()
}

/** Клавиша на узле и кадр модели фокуса. Отдаёт событие: по нему видно, погашена ли она. */
async function press(
	target: HTMLElement,
	key: string,
	init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })

	target.dispatchEvent(event)
	flushSync()
	await nextFrame()

	return event
}

/** Открыть кликом по триггеру и дождаться кадра модели фокуса. */
async function open(): Promise<void> {
	click(triggerNode())
	await nextFrame()
}

/**
 * The first opening of the menu and of the listed submenus, then closing:
 * items are mounted from their panel's first opening on, and after it the
 * menu is closed again with every item in place.
 */
async function firstOpening(...submenus: ReadonlyArray<() => HTMLElement>): Promise<void> {
	await open()

	for (const row of submenus) click(row())

	click(triggerNode())
	await nextFrame()
}

/** Панель по `id` — так на неё ссылается `aria-controls`. */
const panelOf = (target: HTMLElement): HTMLElement =>
	node(`#${target.getAttribute('aria-controls') ?? ''}`)

const shown = (target: HTMLElement) => target.style.display !== 'none'

/** Строка пункта по тексту в панели. */
function rowIn(scope: HTMLElement, text: string): HTMLElement {
	const row = [...scope.querySelectorAll<HTMLElement>('[role^="menuitem"]')].find((candidate) =>
		candidate.textContent?.trim().startsWith(text),
	)

	if (!row) throw new Error(`строки «${text}» нет`)

	return row
}

/** Тексты строк пунктов-действий и подменю панели по порядку. */
const texts = (scope: HTMLElement) =>
	[...scope.querySelectorAll('[role="menuitem"]')].map((row) => row.textContent?.trim())

/** Модификаторы варианта узла. */
const variantsOf = (target: Element | null | undefined) =>
	[...(target?.classList ?? [])].filter((cls) => cls.includes('--variant-'))

const ITEMS = [
	{ value: 'edit', text: 'Изменить' },
	{ value: 'remove', text: 'Удалить', variant: 'danger' as const },
]

describe('составной компонент', () => {
	it('части Menu — плоские компоненты', () => {
		expect(Menu.Item).toBe(MenuItem)
		expect(Menu.CheckboxItem).toBe(MenuCheckboxItem)
		expect(Menu.RadioItem).toBe(MenuRadioItem)
		expect(Menu.RadioGroup).toBe(MenuRadioGroup)
		expect(Menu.Group).toBe(MenuGroup)
		expect(Menu.Separator).toBe(MenuSeparator)
		expect(Menu.Submenu).toBe(MenuSubmenu)
		expect(Menu.PopoverItem).toBe(MenuPopoverItem)
		expectTypeOf(Menu.Item).toEqualTypeOf<typeof MenuItem>()
		expectTypeOf(Menu.Submenu).toEqualTypeOf<typeof MenuSubmenu>()
	})
})

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		const { container } = await render({ items: ITEMS, trigger })

		const root = node('.so-menu')

		expect(root.localName).toBe('span')
		expect(root.contains(triggerNode())).toBe(true)
		expect(root.contains(panel())).toBe(false)
		expect(container.contains(panel())).toBe(false)
		expect(document.body.contains(panel())).toBe(true)
		expect(isOpen()).toBe(false)
	})

	/** Триггер и место панели стоят вплотную: пробел Svelte оставил бы в корне текстом. */
	it('в корне — триггер и место панели, без текста между ними', async () => {
		await render({ items: ITEMS, trigger })

		expect(contentOf(node('.so-menu'))).toEqual(['button'])
	})

	it('панель — меню с именем от кнопки, триггер ссылается на панель', async () => {
		await render({ items: ITEMS, trigger })

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
		expect(node('.so-menu__list').hasAttribute('role')).toBe(false)
	})

	it('пункты из данных — действия: строка с ролью и вне обхода Tab', async () => {
		await render({ items: ITEMS, trigger })
		await open()

		expect(rows().map((row) => row.textContent?.trim())).toEqual(['Изменить', 'Удалить'])
		expect(rows().map((row) => row.getAttribute('role'))).toEqual(['menuitem', 'menuitem'])
		expect(rows().map((row) => row.getAttribute('tabindex'))).toEqual(['-1', '-1'])
		expect(rows().some((row) => row.hasAttribute('aria-checked'))).toBe(false)
	})

	it('размер и вариант меню — модификаторами панели, свой вариант — у пункта', async () => {
		await render({ items: ITEMS, size: 'lg', variant: 'brand', trigger })
		await open()

		expect(panel().classList).toContain('so-frame')
		expect(panel().classList).toContain('so-menu__panel--size-lg')
		expect(panel().classList).toContain('so-menu__panel--variant-brand')

		const [edit, remove] = [...panel().querySelectorAll('.so-menu-item')]

		expect(edit.classList).toContain('so-menu-item--size-lg')
		expect(remove.classList).toContain('so-menu-item--size-lg')
		// Вариант меню пункту не пишется: тема красит его с панели
		expect([...edit.classList].some((cls) => cls.includes('--variant-'))).toBe(false)
		expect(remove.classList).toContain('so-menu-item--variant-danger')
	})

	/** Снимок классов панели уходит в `class` Frame: смена размера — тот же узел с новым классом. */
	it('смена размера меню — новые классы панели на том же узле', async () => {
		const props = reactiveProps<MenuProps>({ items: ITEMS, size: 'lg', trigger })

		await render(props)

		const first = panel()

		props.size = 'sm'
		flushSync()

		expect(panel()).toBe(first)
		expect(first.classList).toContain('so-menu__panel--size-sm')
		expect(first.classList).not.toContain('so-menu__panel--size-lg')
	})

	it('слоты пункта из данных пробрасываются с пунктом в scope', async () => {
		await render({
			items: ITEMS,
			trigger,
			'item-leading': scopeMarkup<{ item: IMenuItem }>(
				({ item }) => `<i class="so-test-icon">${String(item.value)}</i>`,
			),
			item: scopeText<{ text: string; item: IMenuItem }>(({ text }) => `${text}…`),
			'item-trailing': scopeMarkup<{ item: IMenuItem }>(({ item }) =>
				item.value === 'remove' ? '<kbd>Del</kbd>' : '<kbd></kbd>',
			),
		})
		await open()

		const [edit, remove] = rows()

		expect(node('.so-menu-item__icon .so-test-icon', edit).textContent).toBe('edit')
		expect(node('.so-button__text', edit).textContent).toBe('Изменить…')
		expect(node('.so-menu-item__shortcut', edit).textContent).toBe('')
		expect(node('.so-menu-item__shortcut', remove).textContent).toBe('Del')
	})

	it('пустые значок и подсказка — без содержимого: тема прячет их по :empty', async () => {
		await render({ items: ITEMS, trigger })

		for (const row of rows()) {
			expect(contentOf(node('.so-menu-item__icon', row))).toEqual([])
			expect(contentOf(node('.so-menu-item__shortcut', row))).toEqual([])
		}
	})
})

describe('открытие', () => {
	it('клик по триггеру открывает меню, повторный — закрывает', async () => {
		await render({ items: ITEMS, trigger })

		await open()

		expect(isOpen()).toBe(true)
		expect(triggerNode().getAttribute('aria-expanded')).toBe('true')
		expect(triggerNode().dataset.selected).toBe('true')
		expect(node('.so-menu').dataset.open).toBe('true')

		click(triggerNode())

		expect(isOpen()).toBe(false)
	})

	it('open пропом и onChangeOpen — в обе стороны', async () => {
		const props = reactiveProps<MenuProps>({
			items: ITEMS,
			open: false,
			onChangeOpen: (value) => {
				props.open = value
			},
			trigger,
		})

		await render(props)

		props.open = true
		flushSync()

		expect(isOpen()).toBe(true)

		click(triggerNode())

		expect(props.open).toBe(false)
		expect(isOpen()).toBe(false)
	})
})

/**
 * Связка триггера меняется на каждое открытие (`aria-expanded`,
 * `data-selected`), а триггер — тот же узел: scope сниппет читает геттером, и
 * прочитанное в разметке сниппета обновляется на месте. Новый триггер на
 * каждую смену связки уронил бы фокус, стоявший на прежнем, на `body`.
 */
describe('триггер — тот же узел', () => {
	it('после открытия и закрытия — тот же узел с новой связкой', async () => {
		await render({ items: ITEMS, trigger })

		const first = triggerNode()

		await open()

		expect(triggerNode()).toBe(first)
		expect(first.getAttribute('aria-expanded')).toBe('true')
		expect(first.dataset.selected).toBe('true')

		await press(rowOf('Изменить'), 'Escape')

		expect(triggerNode()).toBe(first)
		expect(first.getAttribute('aria-expanded')).toBe('false')
		expect(first.dataset.selected).toBe('false')
	})

	it('после закрытия кликом по триггеру фокус остаётся на нём', async () => {
		await render({ items: ITEMS, trigger })
		await open()

		click(triggerNode())

		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})
})

describe('нажатие пунктов', () => {
	it('клик строки действия закрывает меню, сообщает choose и возвращает фокус', async () => {
		const chosen: unknown[] = []

		await render({ items: ITEMS, onChoose: (item) => chosen.push(item.value), trigger })

		await open()
		click(rowOf('Удалить'))

		expect(chosen).toEqual(['remove'])
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Enter на строке — её клик: пункт нажат один раз', async () => {
		const chosen: unknown[] = []

		await render({ items: ITEMS, onChoose: (item) => chosen.push(item.value), trigger })

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		expect(document.activeElement).toBe(rowOf('Изменить'))

		await press(rowOf('Изменить'), 'Enter')

		expect(chosen).toEqual(['edit'])
		expect(isOpen()).toBe(false)
	})

	it('выключенный пункт не нажимается', async () => {
		const chosen: unknown[] = []

		await render({
			items: [{ value: 'edit', text: 'Изменить', disabled: true }],
			onChoose: (item) => chosen.push(item.value),
			trigger,
		})

		await open()
		click(rowOf('Изменить'))

		expect(rowOf('Изменить').getAttribute('aria-disabled')).toBe('true')
		expect(chosen).toEqual([])
		expect(isOpen()).toBe(true)
	})

	/**
	 * Отметка — в обе стороны, парой «проп + колбэк»: `selected` пропом пишет
	 * её, а `onChangeSelected` приходит флажку, чья отметка сменилась, и несёт
	 * её. Отметку приложение держит у себя и коллекцию не читает; соседний
	 * флажок, чья отметка не менялась, колбэка не получает.
	 */
	it('флажок отмечается кликом и меню не закрывает: selected пропом и onChangeSelected', async () => {
		const chosen: unknown[] = []
		const ruler: boolean[] = []
		const grid = reactiveProps<MenuCheckboxItemProps>({
			selected: false,
			onChangeSelected: (selected) => {
				grid.selected = selected
			},
		})

		await renderHarness({
			case: 'items',
			menu: { onChoose: (item) => chosen.push(item.value) },
			grid,
			ruler: { selected: true, onChangeSelected: (selected) => ruler.push(selected) },
		})
		await open()
		ruler.length = 0

		expect(rowOf('Сетка').getAttribute('role')).toBe('menuitemcheckbox')
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')

		click(rowOf('Сетка'))

		expect(grid.selected).toBe(true)
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		// Отметки флажков независимы, меню открыто, choose нет
		expect(rowOf('Линейка').getAttribute('aria-checked')).toBe('true')
		expect(ruler).toEqual([])
		expect(isOpen()).toBe(true)
		expect(chosen).toEqual([])

		click(rowOf('Сетка'))

		expect(grid.selected).toBe(false)
		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('false')

		grid.selected = true
		flushSync()

		expect(rowOf('Сетка').getAttribute('aria-checked')).toBe('true')
		expect(ruler).toEqual([])
	})

	it('отметка рисуется только у отмеченного флажка, обёртка — у всех флажков', async () => {
		await renderHarness({ case: 'items', ruler: { selected: true } })
		await open()

		const indicator = (text: string) => rowOf(text).querySelector('.so-menu-item__indicator')

		expect(indicator('Сетка')?.getAttribute('aria-hidden')).toBe('true')
		expect(indicator('Сетка')?.querySelector('svg, .so-icon')).toBeNull()
		expect(contentOf(node('.so-menu-item__indicator', rowOf('Сетка')))).toEqual([])
		expect(indicator('Линейка')?.querySelector('.so-icon')).not.toBeNull()
		expect(indicator('Изменить')).toBeNull()
	})

	it('слот отметки флажка подменяет иконку, scope — отмечен ли флажок', async () => {
		await renderHarness({
			case: 'items',
			grid: {
				selected: true,
				'indicator-icon': scopeMarkup<{ selected: boolean }>(
					({ selected }) =>
						`<i class="so-test-mark" data-mark="${String(selected)}"></i>`,
				),
			},
		})
		await open()

		expect(node('.so-test-mark', rowOf('Сетка')).dataset.mark).toBe('true')
		expect(rowOf('Сетка').querySelector('.so-menu-item__indicator .so-icon')).toBeNull()
	})

	/** Клик потребителя приходит после нажатия пункта: своё — первым. */
	it('клик потребителя по строке не отменяет нажатие пункта', async () => {
		const order: string[] = []

		await renderHarness({
			case: 'items',
			menu: { onChoose: () => order.push('choose') },
			edit: { onclick: () => order.push('click') },
		})

		await open()
		click(rowOf('Изменить'))

		expect(order).toEqual(['choose', 'click'])
		expect(isOpen()).toBe(false)
	})
})

/**
 * Переключатели: `Menu.RadioGroup` со своим значением и `Menu.RadioItem` в
 * ней. Отметка — выбор коллекции меню, и в группе отмечен один; группу
 * переключатель берёт лифтом. Модель — `core/__tests__/menu.spec.ts`, лифт без
 * фреймворка — `setup/__tests__/menu-radio.spec.ts`.
 */
describe('переключатели', () => {
	/** Группа переключателей, её значение — в пропсах группы: колбэк пишет его туда же. */
	function radioGroup(initial: TMenuRadioGroupValue): MenuRadioGroupProps {
		const group = reactiveProps<MenuRadioGroupProps>({
			value: initial,
			onChangeValue: (payload) => {
				group.value = payload.newValue
			},
		})

		return group
	}

	/** Меню с группой «Сортировка» и отмеченным флажком «Сетка» за разделителем. */
	async function renderSort(initial: TMenuRadioGroupValue, menu: MenuProps = {}) {
		const group = radioGroup(initial)

		await renderHarness({ case: 'sort', menu, group })

		return {
			sort: () => group.value,
			setSort: (value: TMenuRadioGroupValue) => {
				group.value = value
				flushSync()
			},
		}
	}

	const checked = () => rows().map((row) => row.getAttribute('aria-checked'))

	it('группа — group с именем от подписи, переключатели — menuitemradio вне обхода Tab', async () => {
		await renderSort(null)
		await open()

		const group = node('.so-menu-group')
		const label = node('.so-menu-group__label', group)

		expect(group.getAttribute('role')).toBe('group')
		expect(group.getAttribute('aria-labelledby')).toBe(label.id)
		expect(label.textContent).toBe('Сортировка')

		expect(rowOf('По имени').getAttribute('role')).toBe('menuitemradio')
		expect(rowOf('По дате').getAttribute('tabindex')).toBe('-1')
		expect(checked()).toEqual(['false', 'false', 'true'])
	})

	it('клик отмечает переключатель и меню не закрывает: value пропом и onChangeValue', async () => {
		const chosen: unknown[] = []
		const { sort } = await renderSort(null, { onChoose: (item) => chosen.push(item.value) })

		await open()
		click(rowOf('По имени'))

		expect(sort()).toBe('name')
		expect(checked()).toEqual(['true', 'false', 'true'])

		click(rowOf('По дате'))

		// В группе отмечен один, флажок — сам по себе
		expect(sort()).toBe('date')
		expect(checked()).toEqual(['false', 'true', 'true'])

		// Отмеченный нажатием не снимается
		click(rowOf('По дате'))

		expect(sort()).toBe('date')
		expect(isOpen()).toBe(true)
		expect(chosen).toEqual([])
	})

	it('значение из приложения отмечает свой переключатель, без него — ни один', async () => {
		const { setSort } = await renderSort('date')
		await open()

		expect(checked()).toEqual(['false', 'true', 'true'])

		setSort('name')

		expect(checked()).toEqual(['true', 'false', 'true'])

		setSort('size')

		expect(checked()).toEqual(['false', 'false', 'true'])
	})

	/**
	 * Отметка переключателя — тоже в обе стороны: сосед, с которого её сняла
	 * группа, узнаёт об этом своим колбэком со значением.
	 */
	it('selected у переключателя — его отметка: значение группы и сосед за ней', async () => {
		const group = radioGroup('name')
		const name = reactiveProps<MenuRadioItemProps>({
			selected: true,
			onChangeSelected: (selected) => {
				name.selected = selected
			},
		})
		const date = reactiveProps<MenuRadioItemProps>({
			selected: false,
			onChangeSelected: (selected) => {
				date.selected = selected
			},
		})

		await renderHarness({ case: 'sort', group, name, date })
		await open()

		date.selected = true
		flushSync()

		expect(group.value).toBe('date')
		expect(name.selected).toBe(false)
		expect(checked()).toEqual(['false', 'true', 'true'])
	})

	it('точка рисуется только у отмеченного, обёртка отметки — у всех переключателей', async () => {
		await renderSort('name')
		await open()

		const indicator = (text: string) => node('.so-menu-item__indicator', rowOf(text))

		expect(indicator('По имени').getAttribute('aria-hidden')).toBe('true')
		expect(indicator('По имени').querySelector('.so-menu-item__dot')).not.toBeNull()
		expect(indicator('По дате').querySelector('.so-menu-item__dot')).toBeNull()
		expect(contentOf(indicator('По дате'))).toEqual([])
	})

	it('две группы одного меню независимы', async () => {
		const group = radioGroup('name')
		const order = radioGroup('asc')

		await renderHarness({ case: 'two-groups', group, order })
		await open()
		click(rowOf('date'))
		click(rowOf('desc'))

		expect([group.value, order.value]).toEqual(['date', 'desc'])
		expect(checked()).toEqual(['false', 'true', 'false', 'true'])
	})

	it('слот отметки подменяет точку, scope — отмечен ли переключатель', async () => {
		await renderHarness({
			case: 'sort',
			group: { value: 'name' },
			name: {
				'indicator-icon': scopeMarkup<{ selected: boolean }>(
					({ selected }) =>
						`<i class="so-test-mark" data-mark="${String(selected)}"></i>`,
				),
			},
		})
		await open()

		expect(node('.so-test-mark', rowOf('По имени')).dataset.mark).toBe('true')
		expect(rowOf('По имени').querySelector('.so-menu-item__dot')).toBeNull()
	})
})

describe('группа и разделитель', () => {
	it('группа — group с именем от подписи, пункты в ней — пункты меню', async () => {
		await renderHarness({ case: 'groups' })
		await open()

		const [labelled, bare] = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]
		const label = node('.so-menu-group__label', labelled)

		expect(labelled.getAttribute('role')).toBe('group')
		expect(label.textContent).toBe('Вид')
		expect(labelled.getAttribute('aria-labelledby')).toBe(label.id)
		expect(label.id).not.toBe('')

		// Без подписи — ни обёртки, ни ссылки
		expect(bare.querySelector('.so-menu-group__label')).toBeNull()
		expect(bare.hasAttribute('aria-labelledby')).toBe(false)

		expect(node('.so-menu-separator').getAttribute('role')).toBe('separator')

		// Навигация идёт сквозь группы: строки в порядке разметки
		triggerNode().focus()
		await press(triggerNode(), 'ArrowUp')

		expect(document.activeElement).toBe(rowOf('Изменить'))
	})

	/** Части стоят вплотную: пробел Svelte оставил бы в группе текстом. */
	it('в группе — подпись и пункты, без текста между ними', async () => {
		await renderHarness({ case: 'groups' })
		await open()

		const [labelled] = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]

		expect(contentOf(labelled)).toEqual(['div', 'div'])
	})
})

/**
 * Группы из данных: метка группы — `_.group` в `items` или `groupBy`, порядок
 * и подписи — `groups`. Меню рисует секции показанного: группу с подписью —
 * `Menu.Group`, пункты без группы — прямо в списке, между секциями —
 * разделитель. Группы из `groups` идут первыми, остальное — по месту, поэтому
 * здесь, где заявлены все группы, пункты без группы — последними. Стрелки
 * ходят тем же порядком, что пункты стоят на экране.
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
		[...node('.so-menu__list').children].map((child) => {
			if (child.classList.contains('so-menu-group')) {
				return `группа ${child.querySelector('.so-menu-group__label')?.textContent ?? ''}`
			}

			if (child.classList.contains('so-menu-separator')) return '—'

			return child.textContent?.trim()
		})

	it('группы с подписью, разделитель — только между секциями, без группы — последними', async () => {
		await render({ items: GROUPED, groups: GROUPS, trigger })
		await open()

		expect(parts()).toEqual(['группа Правка', '—', 'группа Вид', '—', 'Переименовать'])
		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Вырезать',
			'Копировать',
			'Увеличить',
			'Переименовать',
		])

		const groups = [...panel().querySelectorAll<HTMLElement>('.so-menu-group')]

		for (const group of groups) {
			const label = node('.so-menu-group__label', group)

			expect(group.getAttribute('role')).toBe('group')
			expect(group.getAttribute('aria-labelledby')).toBe(label.id)
			expect(label.id).not.toBe('')
		}

		expect(groups[0].contains(rowOf('Копировать'))).toBe(true)
		expect(
			[...panel().querySelectorAll('.so-menu-separator')].map((separator) =>
				separator.getAttribute('role'),
			),
		).toEqual(['separator', 'separator'])
	})

	/** Секции, разделители и пункты стоят вплотную: пробел Svelte оставил бы в списке текстом. */
	it('в списке — только части, без текста между ними', async () => {
		await render({ items: GROUPED, groups: GROUPS, trigger })
		await open()

		expect(contentOf(node('.so-menu__list'))).toEqual(['div', 'div', 'div', 'div', 'div'])
	})

	it('стрелки ходят порядком экрана: ↓ с «Вырезать» — на «Копировать»', async () => {
		await render({ items: GROUPED, groups: GROUPS, trigger })

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
		const props = reactiveProps<MenuProps>({ items: GROUPED, groups: GROUPS, trigger })

		await render(props)
		await open()

		props.groups = [
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'View' },
		]
		flushSync()

		expect(parts()).toEqual(['группа Edit', '—', 'группа View', '—', 'Переименовать'])
	})

	/**
	 * Секции — новые записи на каждую смену, а петля по ним идёт по ключу
	 * секции: смена подписи и новый пункт не пересоздают строк — фокус и узлы
	 * пунктов на месте. С `trackBy` новый состав — правка прежнего, и пункты
	 * секций — те же экземпляры.
	 */
	it('строки пунктов — те же узлы после смены подписи в groups и нового пункта', async () => {
		const props = reactiveProps<MenuProps>({
			items: GROUPED,
			groups: GROUPS,
			trackBy: (item: { value?: unknown }) => item.value,
			trigger,
		})

		await render(props)

		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')

		const before = rows()
		const focused = rowOf('Вырезать')

		expect(document.activeElement).toBe(focused)

		props.groups = [
			{ key: 'edit', label: 'Edit' },
			{ key: 'view', label: 'View' },
		]
		flushSync()

		expect(rows()).toHaveLength(before.length)
		before.forEach((row, index) => expect(rows()[index]).toBe(row))

		props.items = [...GROUPED, { value: 'paste', text: 'Вставить', _: { group: 'edit' } }]
		flushSync()

		expect(rows().map((row) => row.textContent?.trim())).toEqual([
			'Вырезать',
			'Копировать',
			'Вставить',
			'Увеличить',
			'Переименовать',
		])

		for (const row of before) expect(rows()).toContain(row)

		expect(document.activeElement).toBe(focused)
	})

	it('groupBy пропом: ключ группы — из пункта', async () => {
		await render({
			items: ITEMS,
			groupBy: (item: IMenuItem) => (item.variant === 'danger' ? 'danger' : undefined),
			groups: [{ key: 'danger', label: 'Опасное' }],
			trigger,
		})
		await open()

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('группировка через движок: engine.extensions.group после монтирования', async () => {
		const engine = createEngineMenu({ items: ITEMS })

		await render({ engine, trigger })
		await open()

		expect(parts()).toEqual(['Изменить', 'Удалить'])

		engine.extensions.group.groupBy = (item) => (item.value === 'remove' ? 'danger' : undefined)
		engine.extensions.group.groups = [{ key: 'danger', label: 'Опасное' }]
		flushSync()

		expect(parts()).toEqual(['группа Опасное', '—', 'Изменить'])
	})

	it('без группировки — ни групп, ни разделителей: пункты прямо в списке', async () => {
		await render({ items: ITEMS, trigger })
		await open()

		expect(parts()).toEqual(['Изменить', 'Удалить'])
		expect(panel().querySelector('.so-menu-group, .so-menu-separator')).toBeNull()
	})

	it('groupSeparators=false — секции без разделителей, порядок и группы те же', async () => {
		await render({ items: GROUPED, groups: GROUPS, groupSeparators: false, trigger })
		await open()

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])
		expect(panel().querySelector('.so-menu-separator')).toBeNull()
	})

	it('groupSeparators на лету ставит и снимает разделители', async () => {
		const props = reactiveProps<MenuProps>({
			items: GROUPED,
			groups: GROUPS,
			groupSeparators: false,
			trigger,
		})

		await render(props)
		await open()

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])

		props.groupSeparators = true
		flushSync()

		expect(parts()).toEqual(['группа Правка', '—', 'группа Вид', '—', 'Переименовать'])

		props.groupSeparators = false
		flushSync()

		expect(parts()).toEqual(['группа Правка', 'группа Вид', 'Переименовать'])
	})

	it('ручной Menu.Separator разметки свойство не трогает', async () => {
		await renderHarness({ case: 'separator' })
		await open()

		expect(parts()).toEqual(['Изменить', '—', 'Удалить'])
	})
})

/**
 * Группы разметки — `Menu.Group` и `Menu.RadioGroup` — входят в ту же
 * группировку, что группы из данных: их ключ пункты внутри берут лифтом,
 * подпись группа регистрирует в группировке, и `sections` описывают их.
 * Пункт вне группы пишут и над группами («Новый» над «Правкой»): группы не
 * заявлены в `groups`, и показанное идёт по месту — стрелки ходят, как пункты
 * стоят.
 */
describe('группы разметки', () => {
	/** «Новый» — над группой «Правка», «Закрыть» — под группой переключателей. */
	async function renderMarkup() {
		const engine = createEngineMenu()
		const edits = reactiveProps<MenuGroupProps>({ label: 'Правка' })

		await renderHarness({ case: 'markup-groups', menu: { engine }, edits })

		return { engine, edits }
	}

	/** Секции коротко: подпись группы (`null` — без группы) и значения пунктов. */
	const brief = (engine: TMenuCollection) =>
		engine.extensions.group.sections.map(({ group, items }) => [
			group === null ? null : (group.label ?? ''),
			items.map((item) => item.value),
		])

	it('секции — группы разметки с подписью, пункты вне групп — на своих местах', async () => {
		const { engine } = await renderMarkup()
		await open()

		expect(brief(engine)).toEqual([
			[null, ['new']],
			['Правка', ['cut', 'copy']],
			['Сортировка', ['name', 'date']],
			[null, ['close']],
		])
		expect(engine.extensions.group.groups).toEqual([])
	})

	it('стрелки ходят порядком экрана: «Новый» над группой — первым', async () => {
		await renderMarkup()

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
		const { engine, edits } = await renderMarkup()
		await open()

		edits.label = 'Изменение'
		flushSync()

		expect(brief(engine)[1]).toEqual(['Изменение', ['cut', 'copy']])
	})
})

/**
 * Контекстное меню — `openOn="contextmenu"`: в сниппете `trigger` область,
 * меню вызывают над ней, и панель встаёт у точки вызова. Переходы плагинов —
 * `plugins/__tests__/menu.plugin.spec.ts`, расчёт у точки —
 * `setup/__tests__/overlay.spec.ts`; здесь — что проводка доводит точку от
 * ядра до якоря панели и что связка кнопки у области пуста.
 */
describe('контекстное меню', () => {
	const areaNode = () => node('.so-test-area')

	/** Правая кнопка мыши над областью в точке окна. */
	function rightClick(x: number, y: number): void {
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
		flushSync()
	}

	it('у области связки кнопки нет, у панели — роль и id, но не имя от триггера', async () => {
		await render({ items: ITEMS, openOn: 'contextmenu', trigger: area })

		// Связка пуста: на область сниппет кладёт ровно то, что пришло в scope
		expect([...areaNode().attributes].map((attribute) => attribute.name)).toEqual(['class'])
		expect(panel().getAttribute('role')).toBe('menu')
		expect(panel().id).not.toBe('')
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('правая кнопка открывает меню у точки вызова, повторная — переставляет панель', async () => {
		await render({ items: ITEMS, openOn: 'contextmenu', trigger: area })

		rightClick(120, 80)

		expect(isOpen()).toBe(true)
		// Точка — в координатах окна: панель `fixed`, отступ 4px, как у кнопки
		expect(panel().style.position).toBe('fixed')
		expect(panel().style.left).toBe('120px')
		expect(panel().style.top).toBe('84px')

		rightClick(300, 200)

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('300px')
		expect(panel().style.top).toBe('204px')
	})

	it('нажатие в области мимо вызова закрывает меню', async () => {
		await render({ items: ITEMS, openOn: 'contextmenu', trigger: area })

		rightClick(120, 80)

		areaNode().dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', button: 0 }),
		)
		flushSync()

		expect(isOpen()).toBe(false)
	})

	it('смена openOn на лету: у кнопки связка появляется, у области пропадает', async () => {
		const props = reactiveProps<MenuProps>({
			items: ITEMS,
			openOn: 'press' satisfies TMenuOpenOn,
			trigger,
		})

		await render(props)

		expect(triggerNode().getAttribute('aria-haspopup')).toBe('menu')

		props.openOn = 'contextmenu'
		flushSync()

		expect(triggerNode().hasAttribute('aria-haspopup')).toBe(false)
		expect(triggerNode().hasAttribute('aria-controls')).toBe(false)
		expect(panel().hasAttribute('aria-labelledby')).toBe(false)

		props.openOn = 'press'
		flushSync()

		expect(triggerNode().getAttribute('aria-controls')).toBe(panel().id)
		expect(panel().getAttribute('aria-labelledby')).toBe(triggerNode().id)
	})
})

/**
 * Подменю — `Menu.Submenu`: пункт меню, в котором стоит, и меню своих
 * пунктов. Переходы плагинов — `plugins/__tests__/menu-submenu.plugin.spec.ts`,
 * сборка через лифт — `setup/__tests__/menu-submenu.spec.ts`; здесь — что в
 * Svelte пункт входит в коллекцию меню над ним, а его пункты — в его
 * собственную (фасад пункта читает лифт меню раньше, чем фасад меню опускает
 * свой), связки стоят на своих узлах, клавиши и нажатие ходят между уровнями,
 * а выбор в подменю закрывает всё меню.
 */
describe('подменю', () => {
	/** Строка пункта с подменю — узел с ролью у пункта «Поделиться». */
	function shareRow(): HTMLElement {
		const row = [...document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]')].find(
			(candidate) => candidate.textContent?.trim().startsWith('Поделиться'),
		)

		if (!row) throw new Error('строки «Поделиться» нет')

		return row
	}

	const rootPanel = () => panelOf(triggerNode())
	const subPanel = () => panelOf(shareRow())

	/** Меню «Изменить · Поделиться → (Ссылка, Почта) · Удалить» разметкой. */
	const markup = (menu: MenuProps = {}, share: MenuSubmenuProps = {}) =>
		renderHarness({ case: 'submenu', menu, share })

	/** Открыть меню клавишей и спуститься на «Поделиться». */
	async function openOnShare(): Promise<void> {
		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')
		await press(rowIn(rootPanel(), 'Изменить'), 'ArrowDown')
	}

	it('строка — пункт меню, панель подменю — меню с именем от строки, в body и скрыта', async () => {
		const { container } = await markup()
		await firstOpening()

		const row = shareRow()

		expect(row.getAttribute('role')).toBe('menuitem')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-expanded')).toBe('false')
		expect(row.id).not.toBe('')
		expect(subPanel().getAttribute('role')).toBe('menu')
		expect(subPanel().getAttribute('aria-labelledby')).toBe(row.id)
		expect(subPanel().getAttribute('tabindex')).toBe('-1')
		expect(document.body.contains(subPanel())).toBe(true)
		expect(container.contains(subPanel())).toBe(false)
		expect(rootPanel().contains(subPanel())).toBe(false)
		expect(subPanel()).not.toBe(rootPanel())
		expect(shown(subPanel())).toBe(false)
		// Стрелка у конца строки — немая: подменю объявляет aria-haspopup
		expect(node('.so-menu-item__arrow', row).getAttribute('aria-hidden')).toBe('true')
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).not.toBeNull()
	})

	/** Строка и место панели стоят в пункте вплотную: пробел Svelte оставил бы в корне текстом. */
	it('в корне пункта — строка и место панели, без текста между ними', async () => {
		await markup()
		await firstOpening()

		expect(contentOf(shareRow().parentElement ?? shareRow())).toEqual(['div'])
	})

	/**
	 * A menu nobody opened builds only its trigger and an empty panel: no item
	 * rows and nothing in its collection. The first opening mounts the items,
	 * closing keeps them — the same nodes; a submenu's items wait for its own
	 * first opening.
	 */
	it('пункты — с первого открытия панели, закрытие их не снимает; у подменю — с его открытия', async () => {
		const engine = createEngineMenu()
		const values = () => engine.extensions.batch.items.map((item) => item.value)

		await markup({ engine })

		expect(document.body.contains(rootPanel())).toBe(true)
		expect(rootPanel().querySelector('.so-menu-item')).toBeNull()
		expect(values()).toEqual([])

		await open()

		const edit = rowIn(rootPanel(), 'Изменить')

		expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
		expect(values()).toEqual(['edit', 'share', 'remove'])
		expect(subPanel().querySelector('.so-menu-item')).toBeNull()

		click(shareRow())

		const link = rowIn(subPanel(), 'Ссылка')

		expect(texts(subPanel())).toEqual(['Ссылка', 'Почта'])

		click(triggerNode())

		expect(isOpen()).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(rowIn(rootPanel(), 'Изменить')).toBe(edit)
		expect(rowIn(subPanel(), 'Ссылка')).toBe(link)
		expect(values()).toEqual(['edit', 'share', 'remove'])
	})

	it('пункт входит в меню над ним, его пункты — в его собственное меню', async () => {
		await markup()
		await firstOpening(shareRow)

		expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
		expect(texts(subPanel())).toEqual(['Ссылка', 'Почта'])

		// Стрелки меню ходят по его пунктам: из «Поделиться» вниз — «Удалить»
		await openOnShare()

		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'ArrowDown')

		expect(document.activeElement).toBe(rowIn(rootPanel(), 'Удалить'))
	})

	it('→ открывает подменю на первом пункте, ← закрывает уровень — фокус на строке', async () => {
		await markup()

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(shown(subPanel())).toBe(true)
		expect(shareRow().getAttribute('aria-expanded')).toBe('true')
		expect(document.activeElement).toBe(rowIn(subPanel(), 'Ссылка'))
		// Пункт подменю горит, пока открыта его панель
		expect(shareRow().parentElement?.dataset.open).toBe('true')

		await press(rowIn(subPanel(), 'Ссылка'), 'ArrowLeft')

		expect(shown(subPanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(shareRow())
	})

	it('Escape закрывает один уровень, следующий — меню', async () => {
		await markup()

		await openOnShare()
		await press(shareRow(), 'Enter')
		await press(rowIn(subPanel(), 'Ссылка'), 'Escape')

		expect(shown(subPanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(shareRow())

		await press(shareRow(), 'Escape')

		expect(shown(rootPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('клик по строке открывает подменю, повторный его не закрывает', async () => {
		await markup()

		await open()
		click(shareRow())

		expect(shown(subPanel())).toBe(true)

		click(shareRow())

		expect(shown(subPanel())).toBe(true)
	})

	it('выбор в подменю закрывает всё меню, сообщает choose меню и подменю, фокус — на триггер', async () => {
		const root: unknown[] = []
		const nested: unknown[] = []

		await markup(
			{ onChoose: (item) => root.push(item.value) },
			{ onChoose: (item) => nested.push(item.value) },
		)

		await openOnShare()
		await press(shareRow(), 'ArrowRight')
		click(rowIn(subPanel(), 'Почта'))
		await nextFrame()

		expect(root).toEqual(['mail'])
		expect(nested).toEqual(['mail'])
		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Tab в подменю закрывает всё меню и ведёт к остановке за ним', async () => {
		await markup()

		await openOnShare()
		await press(shareRow(), 'ArrowRight')
		await press(rowIn(subPanel(), 'Ссылка'), 'Tab')

		expect(shown(rootPanel())).toBe(false)
		expect(shown(subPanel())).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('open пропом и onChangeOpen — в обе стороны', async () => {
		const share = reactiveProps<MenuSubmenuProps>({
			open: false,
			onChangeOpen: (value) => {
				share.open = value
			},
		})

		await markup({}, share)

		await openOnShare()
		await press(shareRow(), 'ArrowRight')

		expect(share.open).toBe(true)

		share.open = false
		flushSync()

		expect(shown(subPanel())).toBe(false)
	})

	it('размер меню — у панели подменю и у его пунктов', async () => {
		await markup({ size: 'lg' })
		await firstOpening(shareRow)

		expect(subPanel().classList).toContain('so-menu__panel')
		expect(subPanel().classList).toContain('so-menu__panel--size-lg')
		expect(rowIn(subPanel(), 'Ссылка').parentElement?.classList).toContain(
			'so-menu-item--size-lg',
		)
	})

	/**
	 * Панель подменю телепортирована, и класс панели меню до её пунктов не
	 * доходит: вариант меню она несёт своим модификатором, а свой вариант
	 * подменю сильнее. Строкам — ни подменю, ни его пунктов — вариант меню не
	 * пишется: их тема красит с панели, в которой они стоят.
	 */
	it('вариант меню — у панели подменю, свой вариант подменю сильнее; смена на лету', async () => {
		const menu = reactiveProps<MenuProps>({ variant: 'brand' })
		const share = reactiveProps<MenuSubmenuProps>({})
		const setVariant = (variant: TComponentVariant | undefined) => {
			menu.variant = variant
			flushSync()
		}
		const setOwn = (variant: TComponentVariant | undefined) => {
			share.variant = variant
			flushSync()
		}

		await markup(menu, share)
		await firstOpening(shareRow)

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
		expect(variantsOf(shareRow().parentElement)).toEqual([])
		expect(variantsOf(rowIn(subPanel(), 'Ссылка').parentElement)).toEqual([])

		setVariant('danger')

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-danger'])

		setOwn('brand')

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
		expect(variantsOf(shareRow().parentElement)).toEqual(['so-menu-item--variant-brand'])

		// Под своим вариантом подменю смена у меню панели не трогает
		setVariant(undefined)

		expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])

		setOwn(undefined)

		expect(variantsOf(subPanel())).toEqual([])
	})

	it('пункты подменю данными (items) — с группами и пробросом слотов, как у меню', async () => {
		await renderHarness({
			case: 'submenu-items',
			share: {
				items: [
					{ value: 'link', text: 'Ссылка' },
					{ value: 'mail', text: 'Почта', _: { group: 'send' } },
				],
				groups: [{ key: 'send', label: 'Отправить' }],
				item: scopeText<{ text: string; item: IMenuItem }>(({ text }) => `${text}…`),
			},
		})
		await firstOpening(shareRow)

		expect(texts(subPanel())).toEqual(['Почта…', 'Ссылка…'])
		expect(node('.so-menu-group__label', subPanel()).textContent).toBe('Отправить')
	})

	/**
	 * Разделители между секциями своих пунктов подменю просит само: свойство
	 * своё, с умолчанием меню, и от меню над ним не переходит.
	 */
	it('разделители секций подменю — свои: по умолчанию есть, groupSeparators снимает их только у него', async () => {
		const share = reactiveProps<MenuSubmenuProps>({
			items: [
				{ value: 'link', text: 'Ссылка' },
				{ value: 'mail', text: 'Почта', _: { group: 'send' } },
			],
			groups: [{ key: 'send', label: 'Отправить' }],
		})

		await renderHarness({ case: 'submenu-items', menu: { groupSeparators: false }, share })
		await firstOpening(shareRow)

		// Меню своих разделителей не просит, а подменю — по своему умолчанию
		expect(subPanel().querySelectorAll('.so-menu-separator')).toHaveLength(1)

		share.groupSeparators = false
		flushSync()

		expect(subPanel().querySelector('.so-menu-separator')).toBeNull()
	})

	/**
	 * Подменю из данных: пункт `items` с вложенным `items` меню рисует
	 * `Menu.Submenu` из записи коллекции (`ctrl`, `engine`), а подменю так же
	 * рисует свои — уровней сколько угодно: разметка у них одна, сниппет
	 * модуля подменю. Модель — `core/__tests__/menu.spec.ts`, группа
	 * «коллекция меню · подменю из данных».
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

		/** Строка подменю по тексту — на любом уровне. */
		function submenuRow(text: string): HTMLElement {
			const row = [...document.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]')].find(
				(candidate) => candidate.textContent?.trim().startsWith(text),
			)

			if (!row) throw new Error(`строки подменю «${text}» нет`)

			return row
		}

		it('вариант меню — у панелей подменю из данных всех уровней', async () => {
			const props = reactiveProps<MenuProps>({ items: DATA, variant: 'brand', trigger })

			await render(props)
			await firstOpening(shareRow, () => submenuRow('Мессенджеры'))

			const messengers = () => panelOf(submenuRow('Мессенджеры'))

			expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-brand'])
			expect(variantsOf(messengers())).toEqual(['so-menu__panel--variant-brand'])

			props.variant = 'danger'
			flushSync()

			expect(variantsOf(subPanel())).toEqual(['so-menu__panel--variant-danger'])
			expect(variantsOf(messengers())).toEqual(['so-menu__panel--variant-danger'])
		})

		it('пункт с items — подменю: строка объявляет меню, панель — его пункты, третий уровень — тоже', async () => {
			await render({ items: DATA, trigger })
			await firstOpening(shareRow, () => submenuRow('Мессенджеры'))

			const messengers = submenuRow('Мессенджеры')

			expect(texts(rootPanel())).toEqual(['Изменить', 'Поделиться', 'Удалить'])
			expect(shareRow().getAttribute('role')).toBe('menuitem')
			expect(shareRow().getAttribute('tabindex')).toBe('-1')
			expect(shareRow().getAttribute('aria-expanded')).toBe('false')
			expect(subPanel().getAttribute('role')).toBe('menu')
			expect(subPanel().getAttribute('aria-labelledby')).toBe(shareRow().id)
			expect(document.body.contains(subPanel())).toBe(true)
			expect(rootPanel().contains(subPanel())).toBe(false)
			expect(shown(subPanel())).toBe(false)
			expect(texts(subPanel())).toEqual(['Ссылка', 'Почта', 'Мессенджеры'])
			// Третий уровень подменю рисует само
			expect(subPanel().contains(messengers)).toBe(true)
			expect(texts(panelOf(messengers))).toEqual(['Telegram'])
			expect(panelOf(messengers).getAttribute('aria-labelledby')).toBe(messengers.id)
		})

		it('клик по строке открывает подменю из данных, повторный его не закрывает', async () => {
			await render({ items: DATA, trigger })

			await open()
			click(shareRow())

			expect(shown(subPanel())).toBe(true)
			expect(shareRow().getAttribute('aria-expanded')).toBe('true')

			click(shareRow())

			expect(shown(subPanel())).toBe(true)
		})

		it('→ открывает подменю из данных на первом пункте, ← закрывает уровень — фокус на строке', async () => {
			await render({ items: DATA, trigger })

			await openOnShare()
			await press(shareRow(), 'ArrowRight')

			expect(shown(subPanel())).toBe(true)
			expect(document.activeElement).toBe(rowIn(subPanel(), 'Ссылка'))

			await press(rowIn(subPanel(), 'Ссылка'), 'ArrowLeft')

			expect(shown(subPanel())).toBe(false)
			expect(shown(rootPanel())).toBe(true)
			expect(document.activeElement).toBe(shareRow())
		})

		it('клавиши и выбор на втором уровне: choose — корню, меню закрыто целиком, фокус — на триггер', async () => {
			const chosen: unknown[] = []

			await render({ items: DATA, onChoose: (item) => chosen.push(item.value), trigger })

			await openOnShare()
			await press(shareRow(), 'ArrowRight')
			await press(rowIn(subPanel(), 'Ссылка'), 'ArrowDown')

			expect(document.activeElement).toBe(rowIn(subPanel(), 'Почта'))

			await press(rowIn(subPanel(), 'Почта'), 'Enter')

			expect(chosen).toEqual(['mail'])
			expect(shown(rootPanel())).toBe(false)
			expect(shown(subPanel())).toBe(false)
			expect(document.activeElement).toBe(triggerNode())
		})

		it('третий уровень: → открывает его, выбор доходит до корня и закрывает все уровни', async () => {
			const chosen: unknown[] = []

			await render({ items: DATA, onChoose: (item) => chosen.push(item.value), trigger })

			await openOnShare()
			await press(shareRow(), 'ArrowRight')
			await press(rowIn(subPanel(), 'Ссылка'), 'End')

			const messengers = submenuRow('Мессенджеры')
			const deep = panelOf(messengers)

			expect(document.activeElement).toBe(messengers)

			await press(messengers, 'ArrowRight')

			expect(shown(deep)).toBe(true)
			expect(document.activeElement).toBe(rowIn(deep, 'Telegram'))

			await press(rowIn(deep, 'Telegram'), 'Enter')

			expect(chosen).toEqual(['telegram'])
			expect([shown(rootPanel()), shown(subPanel()), shown(deep)]).toEqual([
				false,
				false,
				false,
			])
			expect(document.activeElement).toBe(triggerNode())
		})

		it('патч по trackBy: строка, панель и пункты подменю — те же узлы, текст и состав — новые', async () => {
			const props = reactiveProps<MenuProps>({
				items: DATA,
				trackBy: (item: { value?: unknown }) => item.value,
				trigger,
			})

			await render(props)
			await firstOpening(shareRow)

			const row = shareRow()
			const share = subPanel()
			const link = rowIn(share, 'Ссылка')

			props.items = [
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
			flushSync()

			expect(row.isConnected).toBe(true)
			expect(row.textContent?.trim()).toBe('Отправить')
			expect(panelOf(row)).toBe(share)
			expect(rowIn(share, 'Ссылкой')).toBe(link)
			expect(texts(share)).toEqual(['Ссылкой', 'СМС'])
		})

		it('слоты пунктов из данных — одни на все уровни: значок, текст, строка и стрелка подменю', async () => {
			await render({
				items: DATA,
				trigger,
				'item-leading': scopeMarkup<{ item: IMenuItem }>(
					({ item }) => `<i class="so-test-icon" data-value="${String(item.value)}"></i>`,
				),
				item: scopeText<{ text: string; item: IMenuItem }>(({ text }) => `${text}…`),
				'item-header': scopeText<{ text: string; open: boolean; item: IMenuItem }>(
					({ text, open }) => (open ? `${text} ▸` : text),
				),
				'item-arrow-icon': scopeMarkup<{ item: IMenuItem }>(
					({ item }) =>
						`<b class="so-test-arrow" data-value="${String(item.value)}"></b>`,
				),
			})
			await firstOpening(shareRow, () => submenuRow('Мессенджеры'))

			const messengers = submenuRow('Мессенджеры')
			const label = (row: HTMLElement) => node('.so-button__text', row).textContent
			const mark = (selector: string, row: HTMLElement) => node(selector, row).dataset.value

			// Действия — слот `item`, строки подменю — `item-header`, на каждом уровне
			expect(label(rowIn(rootPanel(), 'Изменить'))).toBe('Изменить…')
			expect(label(shareRow())).toBe('Поделиться')
			expect(label(rowIn(subPanel(), 'Ссылка'))).toBe('Ссылка…')
			expect(label(messengers)).toBe('Мессенджеры')
			expect(label(rowIn(panelOf(messengers), 'Telegram'))).toBe('Telegram…')
			// Значок — у строк обоих видов, стрелка — у подменю, с пунктом в scope
			expect(mark('.so-menu-item__icon .so-test-icon', rowIn(rootPanel(), 'Изменить'))).toBe(
				'edit',
			)
			expect(mark('.so-menu-item__icon .so-test-icon', shareRow())).toBe('share')
			expect(mark('.so-menu-item__icon .so-test-icon', messengers)).toBe('messengers')
			expect(mark('.so-menu-item__arrow .so-test-arrow', shareRow())).toBe('share')
			expect(mark('.so-menu-item__arrow .so-test-arrow', messengers)).toBe('messengers')

			// Строка подменю получает его открытость
			await open()
			click(shareRow())

			expect(label(shareRow())).toBe('Поделиться ▸')
			expect(label(messengers)).toBe('Мессенджеры')
		})

		/**
		 * Сниппет непрозрачен: заданный меню `item-content` подменю из данных
		 * получает каждое, вместо своих пунктов, и пустой — тоже. У Vue и Solid
		 * пустой слот уступает место пунктам из данных, у Svelte панель такого
		 * подменю пуста (docs/architecture.md, слой 8b, «Известные
		 * ограничения»). Пункты разметки в слоте — пункты своего подменю:
		 * стрелки и выбор идут по ним.
		 */
		it('item-content задан — у каждого подменю из данных вместо его пунктов', async () => {
			const chosen: unknown[] = []

			await renderHarness({
				case: 'item-content',
				menu: {
					items: [
						{
							value: 'share',
							text: 'Поделиться',
							items: [
								{ value: 'link', text: 'Ссылка' },
								{ value: 'mail', text: 'Почта' },
							],
						},
						{ value: 'export', text: 'Экспорт', items: [] },
					],
					onChoose: (item) => chosen.push(item.value),
				},
			})
			await firstOpening(shareRow, () => submenuRow('Экспорт'))

			const exportRow = submenuRow('Экспорт')

			expect(texts(subPanel())).toEqual([])
			expect(texts(panelOf(exportRow))).toEqual(['PDF', 'PNG'])

			triggerNode().focus()
			await press(triggerNode(), 'ArrowDown')
			await press(shareRow(), 'ArrowDown')
			await press(exportRow, 'ArrowRight')

			expect(document.activeElement).toBe(rowIn(panelOf(exportRow), 'PDF'))

			await press(rowIn(panelOf(exportRow), 'PDF'), 'ArrowDown')
			await press(rowIn(panelOf(exportRow), 'PNG'), 'Enter')

			expect(chosen).toEqual(['png'])
			expect(shown(rootPanel())).toBe(false)
		})

		/**
		 * Без `trackBy` замена `items` пересобирает меню: подменю — новый пункт с
		 * новым движком, и строку пункта петля рисует заново — ключ `uid`.
		 * Пункты сниппета входят в движок нового подменю: вложенный состав на
		 * месте пропсы без `trackBy` не пишут, и снять их нечему.
		 */
		it('item-content и замена items без trackBy: подменю новое, пункты сниппета — в его коллекции, стрелки и выбор идут по ним', async () => {
			const chosen: unknown[] = []
			const engine = createEngineMenu()
			const menu = reactiveProps<MenuProps>({
				engine,
				items: [{ value: 'export', text: 'Экспорт', items: [] }],
				onChoose: (item) => chosen.push(item.value),
			})
			const values = () =>
				submenuOf(engine, 'export').engine.extensions.batch.items.map((item) => item.value)

			await renderHarness({ case: 'item-content', menu })
			await firstOpening(() => submenuRow('Экспорт'))

			const replaced = submenuOf(engine, 'export')

			expect(values()).toEqual(['pdf', 'png'])

			menu.items = [{ value: 'export', text: 'Выгрузка', items: [] }]
			flushSync()
			await nextFrame()

			// The new submenu mounts the snippet's items from its own first opening on
			await firstOpening(() => submenuRow('Выгрузка'))

			// Новый пункт и новый движок; пункты сниппета — в нём, прежний пуст
			const row = submenuRow('Выгрузка')

			expect(submenuOf(engine, 'export').ctrl).not.toBe(replaced.ctrl)
			expect(submenuOf(engine, 'export').engine).not.toBe(replaced.engine)
			expect(values()).toEqual(['pdf', 'png'])
			expect(replaced.engine.extensions.batch.items).toEqual([])
			expect(texts(panelOf(row))).toEqual(['PDF', 'PNG'])

			triggerNode().focus()
			await press(triggerNode(), 'ArrowDown')
			await press(row, 'ArrowRight')

			expect(document.activeElement).toBe(rowIn(panelOf(row), 'PDF'))

			await press(rowIn(panelOf(row), 'PDF'), 'ArrowDown')
			await press(rowIn(panelOf(row), 'PNG'), 'Enter')

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

		const GROUP = [{ key: 'g' }]

		/**
		 * Пункты рядом с подменю — есть ли секция без группы, в которую оно
		 * переедет, — и секции до переезда. Есть — петля по секциям оставляет её
		 * блок и собирает подменю в нём; нет — собирает блок новой секции. В
		 * каком порядке относительно снятия ушедшей секции, решает петля Svelte,
		 * а привязку владельца держит живое монтирование в обоих.
		 */
		const NEIGHBOURS: ReadonlyArray<
			readonly [string, TCollectionEngineItemSource<IMenuItemSource>[], readonly string[]]
		> = [
			['секция без группы есть', [{ value: 'remove', text: 'Удалить' }], ['group:g', 'free']],
			['секции без группы нет', [], ['group:g']],
		]

		/**
		 * Подменю, переехавшее в другую секцию, Svelte за одну перерисовку
		 * снимает с прежнего места и собирает на новом — с той же записью: тем
		 * же пунктом и тем же движком. Привязку владельца его движка держит
		 * живое монтирование: снятие прежнего привязку нового не трогает, а
		 * приём нового её забирает.
		 */
		it.each(NEIGHBOURS)(
			'переезд в другую группу, %s: владелец движка подменю на месте, размер меню — у его пунктов, выбор — до корня',
			async (_case, neighbours, before) => {
				const chosen: unknown[] = []
				const engine = createEngineMenu()
				const nested: IMenuItemSource[] = [
					{ value: 'link', text: 'Ссылка' },
					{ value: 'mail', text: 'Почта' },
				]
				const props = reactiveProps<MenuProps>({
					engine,
					items: [
						{ value: 'share', text: 'Поделиться', items: nested, _: { group: 'g' } },
						...neighbours,
					],
					groups: GROUP,
					size: 'lg',
					onChoose: (item) => chosen.push(item.value),
					trigger,
				})
				const sections = () =>
					engine.extensions.group.sections.map((section) => section.key)

				engine.extensions.batch.trackBy = (item) => item.value

				await render(props)
				await firstOpening(shareRow)

				const share = submenuOf(engine, 'share')
				const row = shareRow()

				expect(sections()).toEqual(before)
				expect(share.engine.options.get('owner')).toBe(share.ctrl)

				// Патч снял группу: подменю переезжает в секцию без группы
				props.items = [
					{ value: 'share', text: 'Поделиться', items: nested, _: { group: undefined } },
					...neighbours,
				]
				flushSync()
				await nextFrame()

				// Перемонтировано — новые узлы, та же запись
				expect(sections()).toEqual(['free'])
				expect(row.isConnected).toBe(false)
				expect(submenuOf(engine, 'share')).toBe(share)
				expect(share.engine.options.get('owner')).toBe(share.ctrl)

				// Размер меню доходит до пунктов подменю через его владельца
				props.size = 'sm'
				flushSync()

				expect(rowIn(subPanel(), 'Ссылка').parentElement?.classList).toContain(
					'so-menu-item--size-sm',
				)

				await open()
				click(shareRow())
				click(rowIn(subPanel(), 'Почта'))
				await nextFrame()

				expect(chosen).toEqual(['mail'])
				expect(shown(rootPanel())).toBe(false)
				expect(shown(subPanel())).toBe(false)
			},
		)
	})
})

/**
 * Пункт с панелью — `Menu.PopoverItem`: строка открывает сбоку немодальную
 * панель-диалог с любым содержимым. Переходы плагинов —
 * `plugins/__tests__/menu-popover-item.plugin.spec.ts`; здесь — что в Svelte
 * пункт входит в коллекцию меню, связки стоят на своих узлах, панель
 * телепортирована и открывается нажатием и клавишами, фокус ходит между
 * меню и панелью, а содержимое панели меню не закрывает.
 */
describe('пункт с панелью', () => {
	/** Строка пункта с панелью — узел с ролью у пункта «Срок». */
	const dueRow = () => node('.so-menu-item > [aria-haspopup="dialog"]')

	const rootPanel = () => panelOf(triggerNode())
	const duePanel = () => panelOf(dueRow())

	/** Меню «Изменить · Срок → (Раньше, Позже) · Поделиться → (Ссылка)» разметкой. */
	const markup = (menu: MenuProps = {}, due: MenuPopoverItemProps = {}) =>
		renderHarness({ case: 'popover-item', menu, due })

	/** Открыть меню клавишей и спуститься на «Срок». */
	async function openOnDue(): Promise<void> {
		triggerNode().focus()
		await press(triggerNode(), 'ArrowDown')
		await press(rowOf('Изменить'), 'ArrowDown')
	}

	it('строка — пункт меню, панель — диалог с именем от строки, в body и скрыта', async () => {
		const { container } = await markup()
		await firstOpening()

		const row = dueRow()

		expect(row.getAttribute('role')).toBe('menuitem')
		expect(row.getAttribute('tabindex')).toBe('-1')
		expect(row.getAttribute('aria-expanded')).toBe('false')
		expect(row.id).not.toBe('')
		expect(duePanel().getAttribute('role')).toBe('dialog')
		expect(duePanel().getAttribute('aria-labelledby')).toBe(row.id)
		expect(duePanel().getAttribute('tabindex')).toBe('-1')
		expect(duePanel().classList).toContain('so-menu-item__panel')
		expect(document.body.contains(duePanel())).toBe(true)
		expect(container.contains(duePanel())).toBe(false)
		expect(rootPanel().contains(duePanel())).toBe(false)
		expect(duePanel()).not.toBe(rootPanel())
		expect(shown(duePanel())).toBe(false)
		// Содержимое — в своей обёртке, без lazyMount смонтировано сразу
		expect(duePanel().querySelector('.so-menu-item__content .so-test-earlier')).not.toBeNull()
		// Стрелка у конца строки — немая: о панели говорит aria-haspopup
		expect(node('.so-menu-item__arrow', row).getAttribute('aria-hidden')).toBe('true')
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).not.toBeNull()
		// Пункт — в коллекции меню, рядом с остальными
		expect(rows().map((candidate) => candidate.textContent?.trim())).toEqual([
			'Изменить',
			'Срок',
			'Поделиться',
		])
	})

	it('клик по строке открывает панель — фокус в ней, повторный клик её не закрывает', async () => {
		await markup()

		await open()
		click(dueRow())
		await nextFrame()

		expect(shown(duePanel())).toBe(true)
		expect(dueRow().getAttribute('aria-expanded')).toBe('true')
		expect(dueRow().parentElement?.dataset.open).toBe('true')
		expect(document.activeElement).toBe(node('.so-test-earlier'))

		click(dueRow())

		expect(shown(duePanel())).toBe(true)
		expect(shown(rootPanel())).toBe(true)
	})

	it.each(['ArrowRight', 'Enter'])(
		'%s на строке открывает панель — фокус на её первой остановке, меню открыто',
		async (key) => {
			await markup()

			await openOnDue()

			expect(document.activeElement).toBe(dueRow())

			await press(dueRow(), key)

			expect(shown(duePanel())).toBe(true)
			expect(shown(rootPanel())).toBe(true)
			expect(document.activeElement).toBe(node('.so-test-earlier'))
		},
	)

	it('Escape в панели закрывает её — фокус на строке; следующий Escape — меню', async () => {
		await markup()

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		await press(node('.so-test-earlier'), 'Escape')

		expect(shown(duePanel())).toBe(false)
		expect(shown(rootPanel())).toBe(true)
		expect(document.activeElement).toBe(dueRow())

		await press(dueRow(), 'Escape')

		expect(shown(rootPanel())).toBe(false)
		expect(document.activeElement).toBe(triggerNode())
	})

	it('Shift+Tab с первой остановки — на строку, Tab со строки — снова в панель', async () => {
		await markup()

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		await press(node('.so-test-earlier'), 'Tab', { shiftKey: true })

		expect(document.activeElement).toBe(dueRow())
		expect(shown(duePanel())).toBe(true)

		await press(dueRow(), 'Tab')

		expect(document.activeElement).toBe(node('.so-test-earlier'))
	})

	it('стрелка к концу строки открытого пункта ведёт фокус в его панель', async () => {
		await markup()

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		// Фокус на строке, панель открыта — как после открытия наведением
		await press(node('.so-test-earlier'), 'Tab', { shiftKey: true })

		expect(document.activeElement).toBe(dueRow())

		const event = await press(dueRow(), 'ArrowRight')

		expect(event.defaultPrevented).toBe(true)
		expect(shown(duePanel())).toBe(true)
		expect(document.activeElement).toBe(node('.so-test-earlier'))
	})

	it('Tab с последней остановки закрывает всё меню и ведёт к остановке за ним', async () => {
		await markup()

		await openOnDue()
		await press(dueRow(), 'ArrowRight')
		node('.so-test-later').focus()
		await press(node('.so-test-later'), 'Tab')

		expect(shown(rootPanel())).toBe(false)
		expect(shown(duePanel())).toBe(false)
		expect(document.activeElement).toBe(node('.so-test-after'))
	})

	it('нажатие в содержимом панели меню не закрывает и не выбирает пункт', async () => {
		const chosen: unknown[] = []

		await markup({ onChoose: (item) => chosen.push(item.value) })

		await open()
		click(dueRow())
		await nextFrame()
		click(node('.so-test-later'))

		expect(shown(rootPanel())).toBe(true)
		expect(shown(duePanel())).toBe(true)
		expect(chosen).toEqual([])
	})

	it('открыта одна панель: пункт с панелью закрывает подменю, и подменю — его', async () => {
		await markup()

		const shareRow = () => node('.so-menu-item > [aria-haspopup="menu"]')

		await open()
		click(shareRow())
		click(dueRow())

		expect(shown(duePanel())).toBe(true)
		expect(shown(panelOf(shareRow()))).toBe(false)

		click(shareRow())

		expect(shown(duePanel())).toBe(false)
		expect(shown(panelOf(shareRow()))).toBe(true)
	})

	it('lazyMount: содержимое — с первого открытия, закрытие его не снимает', async () => {
		await markup({}, { lazyMount: true })
		await firstOpening()

		expect(duePanel().querySelector('.so-test-earlier')).toBeNull()
		expect(duePanel().querySelector('.so-menu-item__content')).not.toBeNull()

		await open()
		click(dueRow())

		expect(duePanel().querySelector('.so-test-earlier')).not.toBeNull()

		await press(node('.so-test-earlier'), 'Escape')

		expect(shown(duePanel())).toBe(false)
		expect(duePanel().querySelector('.so-test-earlier')).not.toBeNull()
	})

	it('open пропом и onChangeOpen — в обе стороны', async () => {
		const due = reactiveProps<MenuPopoverItemProps>({
			open: false,
			onChangeOpen: (value) => {
				due.open = value
			},
		})

		await markup({}, due)

		await openOnDue()
		await press(dueRow(), 'ArrowRight')

		expect(due.open).toBe(true)

		due.open = false
		flushSync()

		expect(shown(duePanel())).toBe(false)
	})

	it('слоты строки: значок, свой текст со scope и своя стрелка', async () => {
		await renderHarness({ case: 'popover-item-slots' })
		await open()

		const row = dueRow()

		expect(row.querySelector('.so-menu-item__icon .so-test-icon')).not.toBeNull()
		expect(node('.so-button__text', row).textContent).toBe('Срок: закрыт')
		expect(row.querySelector('.so-menu-item__arrow .so-test-arrow')).not.toBeNull()
		expect(row.querySelector('.so-menu-item__arrow .so-icon')).toBeNull()
		expect(node('.so-menu-item__content', duePanel()).textContent).toBe('Календарь')
	})

	it('размер меню — у пункта с панелью, вариант — свой; у панели модификаторов нет', async () => {
		await markup({ size: 'lg' }, { variant: 'danger' })
		await firstOpening()

		const item = dueRow().parentElement

		expect(item?.classList).toContain('so-menu-item--size-lg')
		expect(item?.classList).toContain('so-menu-item--variant-danger')
		// Содержимое панели красится само: размер и вариант меню ему ни к чему
		expect([...duePanel().classList].some((cls) => cls.includes('--size-'))).toBe(false)
	})
})

describe('типы', () => {
	/** Тип проверяет не vitest, а шаг CI «Типы — Svelte». */
	it('слоты несут scope из дескрипторов', () => {
		type TItemScope = { item: IMenuItem }

		expectTypeOf<Snippet<[TItemScope & { text: string }]>>().toExtend<
			NonNullable<MenuProps['item']>
		>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<MenuProps['item-leading']>>()
		expectTypeOf<Snippet<[TItemScope & { text: string; open: boolean }]>>().toExtend<
			NonNullable<MenuProps['item-header']>
		>()
		expectTypeOf<Snippet<[TItemScope]>>().toExtend<NonNullable<MenuProps['item-content']>>()
		expectTypeOf<Snippet<[TItemScope & { text: string }]>>().toExtend<
			NonNullable<MenuSubmenuProps['item']>
		>()
		expectTypeOf<Snippet<[{ text: string }]>>().toExtend<
			NonNullable<MenuItemProps['children']>
		>()
		expectTypeOf<Snippet<[{ text: string; selected: boolean }]>>().toExtend<
			NonNullable<MenuCheckboxItemProps['children']>
		>()
		expectTypeOf<Snippet<[{ selected: boolean }]>>().toExtend<
			NonNullable<MenuRadioItemProps['indicator-icon']>
		>()
		expectTypeOf<Snippet<[{ text: string; open: boolean }]>>().toExtend<
			NonNullable<MenuPopoverItemProps['header']>
		>()
		expectTypeOf<MenuPopoverItemProps['children']>().toEqualTypeOf<Snippet | undefined>()
		expectTypeOf<MenuRadioGroupProps['children']>().toEqualTypeOf<Snippet | undefined>()
	})

	it('колбэки фасадов — пропсы компонентов', () => {
		expectTypeOf<MenuProps>().toHaveProperty('onChoose')
		expectTypeOf<MenuProps>().toHaveProperty('onChangeOpen')
		expectTypeOf<MenuProps>().toHaveProperty('onEngineCreate')
		expectTypeOf<MenuSubmenuProps>().toHaveProperty('onChoose')
		expectTypeOf<MenuSubmenuProps>().toHaveProperty('onChangeOpen')
		expectTypeOf<MenuCheckboxItemProps>().toHaveProperty('onChangeSelected')
		expectTypeOf<MenuRadioGroupProps>().toHaveProperty('onChangeValue')
	})
})
