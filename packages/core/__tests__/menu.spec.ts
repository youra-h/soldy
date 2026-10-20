import { describe, it, expect, vi } from 'vitest'
import {
	TMenu,
	TMenuCheckboxItem,
	TMenuCollectionFacade,
	TMenuGroup,
	TMenuItem,
	TMenuPopoverItem,
	TMenuRadioGroup,
	TMenuRadioItem,
	TMenuSeparator,
	TMenuSubmenu,
	createEngineMenu,
	createEngineSelection,
	isMenuPopoverItem,
	isMenuPopupItem,
	isMenuRadioItem,
	isMenuSubmenu,
	menuOf,
} from '@soldy-ui/core'
import type {
	IMenuItem,
	IMenuItemSource,
	TClasses,
	TGroupSection,
	TInsertEvent,
	TMenuCollection,
	TMenuRadioGroupValue,
	TMenuSubmenuEntries,
	TMenuSubmenuEntry,
	TUpdateEvent,
} from '@soldy-ui/core'

/**
 * Модель Menu: состояние меню и то, что из него следует для разметки, и
 * коллекция пунктов — отметка флажков, нажатие пунктов, размер и вариант.
 *
 * Клавиатура, указатель, фокус и связки `id` — плагины; здесь только ядро.
 */

/** Пункт по `value`: без него дальше проверять нечего. */
function itemOf(items: ReadonlyArray<IMenuItem>, value: string): IMenuItem {
	const item = items.find((candidate) => candidate.value === value)

	if (!item) throw new Error(`пункт "${value}" не найден`)

	return item
}

const values = (items: ReadonlyArray<IMenuItem>): unknown[] => items.map((item) => item.value)

/** Секции коротко: ключ, подпись группы (`null` — без группы) и пункты. */
const brief = (sections: ReadonlyArray<TGroupSection<IMenuItem>>) =>
	sections.map(({ key, group, items }) => [
		key,
		group === null ? null : group.label,
		values(items),
	])

/** Пример владельца: метка группы — в данных, «Переименовать» стоит между пунктами «Правки». */
const GROUPED = [
	{ value: 'cut', text: 'Вырезать', _: { group: 'edit' } },
	{ value: 'rename', text: 'Переименовать' },
	{ value: 'copy', text: 'Копировать', _: { group: 'edit' } },
]

const EDIT = [{ key: 'edit', label: 'Правка' }]

describe('TMenu · умолчания', () => {
	it('закрыто, панель снизу по началу, корень строчный — span', () => {
		const menu = new TMenu()

		expect(menu.open).toBe(false)
		expect(menu.placement).toBe('bottom-start')
		expect(menu.tag).toBe('span')
		expect(menu.classes.toArray()).toContain('so-menu')
	})

	it('пропсы конструктора перекрывают умолчания', () => {
		const menu = new TMenu({ open: true, placement: 'top-end' })

		expect(menu.getProps()).toMatchObject({ open: true, placement: 'top-end' })
	})
})

/** Событие свойства, которое проверяют сторожа владельцев ниже. */
type TGroupSeparatorsEvents = { 'change:groupSeparators': (value: boolean) => void }

/**
 * Владелец своих пунктов — меню или пункт с подменю — для проверок ниже:
 * свойство, его событие и `getProps()`. `events` типизирован структурно, как в
 * `list-contract.spec.ts`: карты событий у меню и подменю разные.
 */
interface IGroupSeparatorsOwner {
	groupSeparators: boolean
	readonly events: {
		on<K extends keyof TGroupSeparatorsEvents>(
			event: K,
			handler: TGroupSeparatorsEvents[K],
		): void
	}
	getProps(): { groupSeparators?: boolean }
}

const SEPARATED_OWNERS: Array<
	[string, (props?: { groupSeparators?: boolean }) => IGroupSeparatorsOwner]
> = [
	['TMenu', (props) => new TMenu(props)],
	['TMenuSubmenu', (props) => new TMenuSubmenu(props)],
]

/**
 * Разделитель между секциями группировки пунктов из данных рисует разметка, а
 * просит его владелец пунктов — меню и пункт с подменю, каждый за свои секции.
 * У меню он по умолчанию есть, у ListBox и Select — нет
 * (`list-contract.spec.ts`).
 */
describe.each(SEPARATED_OWNERS)('%s · разделители секций группировки', (_name, create) => {
	it('по умолчанию есть', () => {
		expect(create().groupSeparators).toBe(true)
	})

	it('выключаются конструктором и сеттером; change:groupSeparators — только на смену', () => {
		expect(create({ groupSeparators: false }).groupSeparators).toBe(false)

		const owner = create()
		const seen: boolean[] = []

		owner.events.on('change:groupSeparators', (value) => seen.push(value))
		owner.groupSeparators = false
		owner.groupSeparators = false
		owner.groupSeparators = true

		expect(seen).toEqual([false, true])
	})

	it('попадает в getProps()', () => {
		expect(create({ groupSeparators: false }).getProps().groupSeparators).toBe(false)
		expect(create().getProps().groupSeparators).toBe(true)
	})
})

describe('TMenu · связка «кнопка ↔ меню»', () => {
	// `id` и ссылки ядро не пишет: их пишет `TMenuIdsPlugin` (plugins, ids.plugin.spec)
	it('панель — меню, без id', () => {
		const aria = new TMenu().aria.toObject()

		expect(aria.role).toBe('menu')
		expect(aria).not.toHaveProperty('id')
	})

	it('триггер объявляет меню и открытость', () => {
		const menu = new TMenu()

		expect(menu.triggerAria.toObject()).toEqual({
			'aria-haspopup': 'menu',
			'aria-expanded': 'false',
		})

		menu.open = true

		expect(menu.triggerAria.get('aria-expanded')).toBe('true')
	})

	it('change:triggerAria — на смену набора триггера', () => {
		const menu = new TMenu()
		const handler = vi.fn()

		menu.events.on('change:triggerAria', handler)
		menu.open = true

		expect(handler).toHaveBeenLastCalledWith(
			expect.objectContaining({ 'aria-expanded': 'true' }),
		)
	})

	it('открытый триггер выглядит нажатым, корень несёт data-open', () => {
		const menu = new TMenu()

		expect(menu.triggerDataset).toEqual({ 'data-selected': 'false' })
		expect(menu.dataset.get('open')).toBe('false')

		menu.open = true

		expect(menu.triggerDataset).toEqual({ 'data-selected': 'true' })
		expect(menu.dataset.get('open')).toBe('true')
	})

	it('change:open — только на смену', () => {
		const menu = new TMenu()
		const handler = vi.fn()

		menu.events.on('change:open', handler)
		menu.open = false
		menu.open = true
		menu.open = true

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith(true)
	})
})

/**
 * Контекстное меню — режим того же меню (`openOn`): в слоте `trigger` область,
 * а не кнопка, и панель встаёт у точки вызова. Открывают его плагины
 * (`plugins/__tests__/menu.plugin.spec.ts`); здесь — что режим значит для
 * состояния и разметки.
 */
describe('TMenu · контекстное меню', () => {
	it('по умолчанию меню открывают кнопкой, режим — из конструктора', () => {
		expect(new TMenu().openOn).toBe('press')

		const menu = new TMenu({ openOn: 'contextmenu' })

		expect(menu.openOn).toBe('contextmenu')
		expect(menu.getProps()).toMatchObject({ openOn: 'contextmenu' })
	})

	it('у области связки «кнопка ↔ меню» нет: набор триггера пуст и у открытого', () => {
		const menu = new TMenu({ openOn: 'contextmenu' })

		expect(menu.triggerAria.toObject()).toEqual({})

		menu.open = true

		expect(menu.triggerAria.toObject()).toEqual({})
		// Панель — меню в любом режиме, корень несёт открытость
		expect(menu.aria.get('role')).toBe('menu')
		expect(menu.dataset.get('open')).toBe('true')
	})

	it('смена режима на лету ставит и снимает связку — с текущей открытостью', () => {
		const menu = new TMenu({ open: true })
		const handler = vi.fn()

		menu.events.on('change:triggerAria', handler)
		menu.openOn = 'contextmenu'

		expect(menu.triggerAria.toObject()).toEqual({})
		expect(handler).toHaveBeenLastCalledWith({})

		menu.openOn = 'press'

		expect(menu.triggerAria.toObject()).toEqual({
			'aria-haspopup': 'menu',
			'aria-expanded': 'true',
		})
	})

	it('change:openOn — только на смену', () => {
		const menu = new TMenu()
		const handler = vi.fn()

		menu.events.on('change:openOn', handler)
		menu.openOn = 'press'
		menu.openOn = 'contextmenu'
		menu.openOn = 'contextmenu'

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith('contextmenu')
	})

	it('точки нет, пока меню не вызвали', () => {
		expect(new TMenu({ openOn: 'contextmenu' }).point).toBe(null)
	})

	/**
	 * Точка уходит за границу core → ui значением: адаптер узнаёт о смене по
	 * новому объекту, а та же точка — не смена.
	 */
	it('точка — значение: новый объект на смену, та же точка ничего не шлёт', () => {
		const menu = new TMenu({ openOn: 'contextmenu' })
		const handler = vi.fn()
		const given = { x: 120, y: 80 }

		menu.events.on('change:point', handler)
		menu.point = given

		const first = menu.point

		expect(first).toEqual({ x: 120, y: 80 })
		// Свой объект: чужой, поправленный после записи, точку не двигает
		expect(first).not.toBe(given)
		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenLastCalledWith(first)

		menu.point = { x: 120, y: 80 }

		expect(menu.point).toBe(first)
		expect(handler).toHaveBeenCalledOnce()

		menu.point = { x: 300, y: 80 }

		expect(menu.point).toEqual({ x: 300, y: 80 })
		expect(menu.point).not.toBe(first)
		expect(handler).toHaveBeenCalledTimes(2)

		menu.point = null

		expect(menu.point).toBe(null)
		expect(handler).toHaveBeenLastCalledWith(null)
	})

	it('закрытие точку не снимает: гаснущая панель стоит, где её открыли', () => {
		const menu = new TMenu({ openOn: 'contextmenu' })

		menu.point = { x: 40, y: 60 }
		menu.open = true
		menu.open = false

		expect(menu.point).toEqual({ x: 40, y: 60 })
	})

	it('смена режима снимает точку: кнопка открывает меню у себя', () => {
		const menu = new TMenu({ openOn: 'contextmenu' })
		const handler = vi.fn()

		menu.point = { x: 40, y: 60 }
		menu.events.on('change:point', handler)
		menu.openOn = 'press'

		expect(menu.point).toBe(null)
		expect(handler).toHaveBeenCalledWith(null)
	})
})

/**
 * Панель телепортирована, и модификаторы корня до неё не доходят: размер и
 * вариант меню у неё свои модификаторы — набор `panelClasses`.
 */
describe('TMenu · классы панели', () => {
	it('блок панели и размер меню по умолчанию, варианта нет', () => {
		expect(new TMenu().panelClasses.toArray()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-normal',
		])
	})

	it('размер и вариант из конструктора', () => {
		expect(new TMenu({ size: 'lg', variant: 'danger' }).panelClasses.toArray()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-lg',
			'so-menu__panel--variant-danger',
		])
	})

	it('смена размера и варианта меняет модификатор, а не добавляет второй', () => {
		const menu = new TMenu({ variant: 'brand' })
		const handler = vi.fn()

		menu.events.on('change:panelClasses', handler)

		menu.size = 'xl'
		menu.variant = 'danger'

		expect(menu.panelClasses.toArray()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-xl',
			'so-menu__panel--variant-danger',
		])

		menu.variant = undefined

		expect(menu.panelClasses.toArray()).toEqual(['so-menu__panel', 'so-menu__panel--size-xl'])
		expect(handler).toHaveBeenLastCalledWith(['so-menu__panel', 'so-menu__panel--size-xl'])
	})

	it('за границу уходит снимок, а не живой набор', () => {
		const menu = new TMenu()
		const snapshot = menu.panelClasses.valueOf()

		menu.size = 'sm'

		expect(snapshot).toEqual(['so-menu__panel', 'so-menu__panel--size-normal'])
	})

	/**
	 * Вариант панели — то, что коллекция меню отдаёт подменю среди пунктов
	 * (`IMenuOwner.panelVariant`). У меню это его вариант.
	 */
	it('вариант панели — вариант меню; change:panelVariant — только на его смену', () => {
		const menu = new TMenu({ variant: 'brand' })
		const handler = vi.fn()

		expect(menu.panelVariant).toBe('brand')

		menu.events.on('change:panelVariant', handler)
		menu.variant = 'brand'
		menu.variant = 'danger'
		menu.variant = undefined

		expect(menu.panelVariant).toBeUndefined()
		expect(handler.mock.calls).toEqual([
			[{ newValue: 'danger', oldValue: 'brand' }],
			[{ newValue: undefined, oldValue: 'danger' }],
		])
	})

	it('отменённая запись варианта вариант панели не меняет', () => {
		const menu = new TMenu({ variant: 'brand' })
		const handler = vi.fn()

		menu.events.on('change:variant:before', (e) => e.preventDefault())
		menu.events.on('change:panelVariant', handler)
		menu.variant = 'danger'

		expect(menu.panelVariant).toBe('brand')
		expect(menu.panelClasses.toArray()).toContain('so-menu__panel--variant-brand')
		expect(handler).not.toHaveBeenCalled()
	})
})

describe('пункты меню', () => {
	it('действие — menuitem, не отмечается, строка на div', () => {
		const item = new TMenuItem({ value: 'edit', text: 'Изменить' })

		expect(item.aria.get('role')).toBe('menuitem')
		expect(item.checkable).toBe(false)
		expect(item.tag).toBe('div')
		expect(item.classes.toArray()).toContain('so-menu-item')
	})

	it('флажок — menuitemcheckbox, отмечается, и он пункт', () => {
		const item = new TMenuCheckboxItem({ value: 'grid', text: 'Сетка' })

		expect(item.aria.get('role')).toBe('menuitemcheckbox')
		expect(item.checkable).toBe(true)
		expect(item).toBeInstanceOf(TMenuItem)
		expect(item.classes.toArray()).toContain('so-menu-item')
	})

	it('выключенный пункт объявляет это на строке, а тема — на корне', () => {
		const item = new TMenuItem({ disabled: true })

		expect(item.aria.get('aria-disabled')).toBe('true')
		expect(item.dataset.get('disabled')).toBe('true')
	})

	it('текст правит подписчик change:text:before', () => {
		const item = new TMenuItem({ text: 'Изменить' })

		item.events.on('change:text:before', (e) => {
			e.value = e.value.trim()
		})

		item.text = '  Удалить  '

		expect(item.text).toBe('Удалить')
	})
})

describe('группа и разделитель', () => {
	it('группа — group с подписью, набор подписи живой', () => {
		const group = new TMenuGroup({ label: 'Вид' })
		const labels = vi.fn()
		const sets = vi.fn()

		expect(group.aria.get('role')).toBe('group')
		expect(group.label).toBe('Вид')

		group.events.on('change:label', labels)
		group.events.on('change:labelAria', sets)

		group.label = 'Вид'
		group.label = 'Сортировка'
		group.labelAria.add('id', 'x')

		expect(labels).toHaveBeenCalledOnce()
		expect(labels).toHaveBeenCalledWith('Сортировка')
		expect(sets).toHaveBeenCalledWith({ id: 'x' })
	})

	it('без подписи подпись пуста', () => {
		expect(new TMenuGroup().label).toBe('')
	})

	it('разделитель — separator', () => {
		expect(new TMenuSeparator().aria.get('role')).toBe('separator')
	})
})

describe('коллекция меню', () => {
	it('режим выбора — multiple: флажки отмечаются независимо', () => {
		const { selection } = createEngineMenu().extensions

		expect(selection.mode).toBe('multiple')
	})

	it('пункты из данных — действия', () => {
		const { batch } = createEngineMenu({
			owner: new TMenu(),
			items: [{ value: 'edit', text: 'Изменить' }],
		}).extensions

		expect(itemOf(batch.items, 'edit')).toBeInstanceOf(TMenuItem)
		expect(itemOf(batch.items, 'edit')).not.toBeInstanceOf(TMenuCheckboxItem)
	})

	it('флажок, пришедший готовым, остаётся флажком', () => {
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const { batch } = createEngineMenu({ items: [grid] }).extensions

		expect(batch.items).toEqual([grid])
	})

	/** Остановок Tab у меню нет: Tab его закрывает, а по пунктам ходят клавиши. */
	it('каждому пункту — tabindex="-1", и добавленному тоже', () => {
		const { batch, plain } = createEngineMenu({
			items: [{ value: 'a' }, new TMenuCheckboxItem({ value: 'b' })],
		}).extensions

		plain.push({ value: 'c' })

		expect(batch.items.map((item) => item.aria.get('tabindex'))).toEqual(['-1', '-1', '-1'])
	})

	it('aria-checked — у флажков, по выбору; у действий его нет', () => {
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const edit = new TMenuItem({ value: 'edit' })
		const { selection } = createEngineMenu({ items: [edit, grid] }).extensions

		expect(grid.aria.get('aria-checked')).toBe('false')
		expect(edit.aria.has('aria-checked')).toBe(false)

		selection.select(grid)

		expect(grid.aria.get('aria-checked')).toBe('true')
		expect(grid.dataset.get('selected')).toBe('true')
		expect(edit.aria.has('aria-checked')).toBe(false)
	})

	/** Так флажок разметки входит в меню: регистрация, потом `meta` из его пропсов. */
	it('отметка из разметки (`meta`) доезжает до aria-checked', () => {
		const engine = createEngineMenu()
		const ruler = new TMenuCheckboxItem({ value: 'ruler' })

		engine.extensions.plain.push(ruler)
		engine.extensions.meta.apply(ruler, { selected: true })

		expect(ruler.aria.get('aria-checked')).toBe('true')
		expect(engine.extensions.selection.selected).toEqual([ruler])
	})
})

describe('коллекция меню · нажатие пунктов', () => {
	it('действие закрывает меню и сообщает choose — уже закрытым', () => {
		const owner = new TMenu({ open: true })
		const engine = createEngineMenu({ owner, items: [{ value: 'edit' }] })
		const { batch, menu } = engine.extensions
		const seen: boolean[] = []

		menu.events.on('choose', () => seen.push(owner.open))

		expect(menu.chooseItem(itemOf(batch.items, 'edit'))).toBe(true)
		expect(owner.open).toBe(false)
		expect(seen).toEqual([false])
	})

	it('выключенное действие не нажимается: меню открыто, choose нет', () => {
		const owner = new TMenu({ open: true })
		const { batch, menu } = createEngineMenu({
			owner,
			items: [{ value: 'edit', disabled: true }],
		}).extensions
		const choose = vi.fn()

		menu.events.on('choose', choose)

		expect(menu.chooseItem(itemOf(batch.items, 'edit'))).toBe(false)
		expect(owner.open).toBe(true)
		expect(choose).not.toHaveBeenCalled()
	})

	it('флажок переключает отметку и меню не закрывает', () => {
		const owner = new TMenu({ open: true })
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const ruler = new TMenuCheckboxItem({ value: 'ruler' })
		const { menu, selection } = createEngineMenu({ owner, items: [grid, ruler] }).extensions
		const choose = vi.fn()

		menu.events.on('choose', choose)

		expect(menu.toggleItem(grid)).toBe(true)
		expect(menu.toggleItem(ruler)).toBe(true)
		expect(selection.selected).toEqual([grid, ruler])

		expect(menu.toggleItem(grid)).toBe(false)
		expect(selection.selected).toEqual([ruler])
		expect(owner.open).toBe(true)
		expect(choose).not.toHaveBeenCalled()
	})

	it('выключенный флажок не переключается', () => {
		const grid = new TMenuCheckboxItem({ value: 'grid', disabled: true })
		const { menu, selection } = createEngineMenu({ items: [grid] }).extensions

		expect(menu.toggleItem(grid)).toBe(false)
		expect(selection.selected).toEqual([])
	})

	it('отмена в item:select:before отметку не ставит', () => {
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const { menu, selection } = createEngineMenu({ items: [grid] }).extensions

		selection.events.on('item:select:before', (e) => e.preventDefault())

		expect(menu.toggleItem(grid)).toBe(false)
		expect(grid.aria.get('aria-checked')).toBe('false')
	})

	it('нажатие — через item-адаптер пункта', () => {
		const owner = new TMenu({ open: true })
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const engine = createEngineMenu({ owner, items: [{ value: 'edit' }, grid] })
		const { batch, menu, selection } = engine.extensions

		menu.createItem(grid).toggle()

		expect(selection.isSelected(grid)).toBe(true)

		menu.createItem(itemOf(batch.items, 'edit')).choose()

		expect(owner.open).toBe(false)
	})
})

describe('фасад меню', () => {
	it('отдаёт choose пробросом расширения', () => {
		const owner = new TMenu({ open: true })
		const facade = new TMenuCollectionFacade({ items: [{ value: 'edit' }] }, { owner })
		const choose = vi.fn()

		facade.events.on('choose', choose)
		facade.extensions.menu.chooseItem(itemOf(facade.extensions.batch.items, 'edit'))

		expect(choose).toHaveBeenCalledWith(itemOf(facade.extensions.batch.items, 'edit'))
	})

	/** Движок снаружи со своим выбором (`single`) иначе снимал бы отметку первого флажка вторым. */
	it('движок снаружи переводит в multiple', () => {
		const engine = createEngineSelection()
		const facade = new TMenuCollectionFacade({}, { owner: new TMenu(), engine })
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const ruler = new TMenuCheckboxItem({ value: 'ruler' })

		facade.items = [grid, ruler]
		facade.extensions.menu.toggleItem(grid)
		facade.extensions.menu.toggleItem(ruler)

		expect(engine.extensions.selection.mode).toBe('multiple')
		expect(facade.selected).toEqual([grid, ruler])
	})
})

/**
 * Пункт с подменю — пункт меню, в котором стоит, и владелец своих пунктов.
 * Клавиши уровней, наведение и фокус — плагины
 * (`plugins/__tests__/menu-submenu.plugin.spec.ts`); здесь — состояние
 * пункта и то, что его коллекция и коллекция меню делают с открытостью и
 * выбором.
 */
describe('TMenuSubmenu · пункт', () => {
	it('пункт меню с ролью menuitem: объявляет подменю и закрыт', () => {
		const share = new TMenuSubmenu({ value: 'share', text: 'Поделиться' })

		expect(share).toBeInstanceOf(TMenuItem)
		expect(isMenuSubmenu(share)).toBe(true)
		expect(isMenuSubmenu(new TMenuItem())).toBe(false)
		// Пункт со своей панелью — как пункт с панелью, но не он
		expect(isMenuPopupItem(share)).toBe(true)
		expect(isMenuPopoverItem(share)).toBe(false)
		expect(share.open).toBe(false)
		expect(share.checkable).toBe(false)
		expect(share.tag).toBe('div')
		expect(share.classes.toArray()).toContain('so-menu-item')
		expect(share.aria.toObject()).toEqual({
			role: 'menuitem',
			'aria-haspopup': 'menu',
			'aria-expanded': 'false',
		})
		expect(share.dataset.get('open')).toBe('false')
	})

	it('открытость — aria-expanded на строке и data-open для темы', () => {
		const share = new TMenuSubmenu({ open: true })

		expect(share.aria.get('aria-expanded')).toBe('true')
		expect(share.dataset.get('open')).toBe('true')
		expect(share.getProps()).toMatchObject({ open: true })

		share.open = false

		expect(share.aria.get('aria-expanded')).toBe('false')
		expect(share.dataset.get('open')).toBe('false')
	})

	it('change:open — только на смену', () => {
		const share = new TMenuSubmenu()
		const handler = vi.fn()

		share.events.on('change:open', handler)
		share.open = false
		share.open = true
		share.open = true

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith(true)
	})

	// `id` и ссылки ядро не пишет: их пишет плагин связок (plugins, ids.plugin.spec)
	it('панель — меню, без id; набор панели живой', () => {
		const share = new TMenuSubmenu()
		const handler = vi.fn()

		expect(share.panelAria.toObject()).toEqual({ role: 'menu' })

		share.events.on('change:panelAria', handler)
		share.panelAria.add('id', 'x')

		expect(handler).toHaveBeenCalledWith({ role: 'menu', id: 'x' })
	})

	it('классы панели — блок панели меню с размером и вариантом подменю', () => {
		const share = new TMenuSubmenu({ variant: 'danger' })
		const handler = vi.fn()

		expect(share.panelClasses.toArray()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-normal',
			'so-menu__panel--variant-danger',
		])

		share.events.on('change:panelClasses', handler)
		share.size = 'lg'
		share.variant = undefined

		expect(share.panelClasses.toArray()).toEqual(['so-menu__panel', 'so-menu__panel--size-lg'])
		expect(handler).toHaveBeenLastCalledWith(['so-menu__panel', 'so-menu__panel--size-lg'])
	})

	/**
	 * Вариант меню над подменю — отдельный вход (`menuVariant`), его пишет
	 * коллекция того меню. Свой вариант подменю он не трогает: в одном поле не
	 * различить, задал ли его потребитель или записало меню.
	 */
	it('вариант панели — свой вариант подменю, без него — вариант меню над ним', () => {
		const share = new TMenuSubmenu()
		const panel = () => share.panelClasses.toArray()

		expect(share.menuVariant).toBeUndefined()
		expect(share.panelVariant).toBeUndefined()
		expect(panel()).toEqual(['so-menu__panel', 'so-menu__panel--size-normal'])

		share.menuVariant = 'brand'

		expect(share.panelVariant).toBe('brand')
		expect(panel()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-normal',
			'so-menu__panel--variant-brand',
		])
		// Вариант меню — вход панели, а не свой вариант: строка его не несёт
		expect(share.variant).toBeUndefined()
		expect(share.classes.toArray().some((cls) => cls.includes('--variant-'))).toBe(false)

		share.variant = 'danger'

		expect(share.panelVariant).toBe('danger')
		expect(panel()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-normal',
			'so-menu__panel--variant-danger',
		])

		share.variant = undefined

		expect(share.panelVariant).toBe('brand')
		expect(panel()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-normal',
			'so-menu__panel--variant-brand',
		])

		share.menuVariant = undefined

		expect(share.panelVariant).toBeUndefined()
		expect(panel()).toEqual(['so-menu__panel', 'so-menu__panel--size-normal'])
	})

	it('change:panelVariant — только на смену итога: вариант меню под своим вариантом не слышен', () => {
		const share = new TMenuSubmenu({ variant: 'danger' })
		const panelVariant = vi.fn()
		const panelClasses = vi.fn()

		share.events.on('change:panelVariant', panelVariant)
		share.events.on('change:panelClasses', panelClasses)

		share.menuVariant = 'brand'
		share.menuVariant = 'brand'
		share.menuVariant = undefined
		share.menuVariant = 'brand'

		expect(share.panelVariant).toBe('danger')
		expect(panelVariant).not.toHaveBeenCalled()
		expect(panelClasses).not.toHaveBeenCalled()

		share.variant = undefined

		expect(panelVariant.mock.calls).toEqual([[{ newValue: 'brand', oldValue: 'danger' }]])

		// Свой вариант, равный варианту меню, итога не меняет — и снятый тоже
		share.variant = 'brand'
		share.variant = undefined

		expect(panelVariant).toHaveBeenCalledOnce()

		share.menuVariant = undefined

		expect(panelVariant.mock.calls).toEqual([
			[{ newValue: 'brand', oldValue: 'danger' }],
			[{ newValue: undefined, oldValue: 'brand' }],
		])
		expect(share.panelClasses.toArray()).toEqual([
			'so-menu__panel',
			'so-menu__panel--size-normal',
		])
	})

	it('вариант меню — не проп: в getProps() его нет', () => {
		const share = new TMenuSubmenu()

		share.menuVariant = 'brand'

		expect(share.getProps()).not.toHaveProperty('menuVariant')
		expect(share.getProps().variant).toBeUndefined()
	})

	it('выбор в подменю: сообщает choose и закрывается', () => {
		const share = new TMenuSubmenu({ open: true })
		const link = new TMenuItem({ value: 'link' })
		const seen: boolean[] = []

		share.events.on('choose', (item) => {
			expect(item).toBe(link)
			seen.push(share.open)
		})
		share.notifyChoose(link)

		// Сообщает раньше, чем закрывается: меню над ним закрывает всю цепочку само
		expect(seen).toEqual([true])
		expect(share.open).toBe(false)
	})
})

describe('коллекция меню · подменю', () => {
	/**
	 * Меню с подменю «Поделиться» (ссылка, почта) и действием «Изменить»;
	 * у подменю своя коллекция — так их собирает разметка.
	 */
	function tree() {
		const root = new TMenu({ open: true })
		const share = new TMenuSubmenu({ value: 'share', text: 'Поделиться' })
		const send = new TMenuSubmenu({ value: 'send', text: 'Отправить' })
		const edit = new TMenuItem({ value: 'edit', text: 'Изменить' })
		const link = new TMenuItem({ value: 'link', text: 'Ссылка' })
		const mail = new TMenuItem({ value: 'mail', text: 'Почта' })
		const engine = createEngineMenu({ owner: root, items: [share, send, edit] })
		const shareEngine = createEngineMenu({ owner: share, items: [link, mail] })

		return { root, share, send, edit, link, mail, engine, shareEngine }
	}

	it('подменю, пришедшее готовым, остаётся подменю', () => {
		const { share, send, edit, engine } = tree()

		expect(engine.extensions.batch.items).toEqual([share, send, edit])
		expect(share.aria.get('tabindex')).toBe('-1')
	})

	it('openItem открывает подменю, выключенному и действию — отказ', () => {
		const { share, edit, engine } = tree()
		const { menu } = engine.extensions

		expect(menu.openItem(share)).toBe(true)
		expect(share.open).toBe(true)
		expect(menu.opened).toBe(share)

		// Открывает, а не переключает: открытое наведением клик не закроет
		expect(menu.openItem(share)).toBe(true)
		expect(share.open).toBe(true)

		expect(menu.openItem(edit)).toBe(false)

		const off = new TMenuSubmenu({ value: 'off', disabled: true })

		engine.extensions.plain.push(off)

		expect(menu.openItem(off)).toBe(false)
		expect(off.open).toBe(false)
	})

	it('пункт с подменю — не действие: chooseItem ему отказывает, меню открыто', () => {
		const { root, share, engine } = tree()
		const choose = vi.fn()

		engine.extensions.menu.events.on('choose', choose)

		expect(engine.extensions.menu.chooseItem(share)).toBe(false)
		expect(root.open).toBe(true)
		expect(choose).not.toHaveBeenCalled()
	})

	it('открыто одно: открывшееся закрывает прежнее — и из кода тоже', () => {
		const { share, send, engine } = tree()

		engine.extensions.menu.openItem(share)
		send.open = true

		expect(share.open).toBe(false)
		expect(send.open).toBe(true)
		expect(engine.extensions.menu.opened).toBe(send)
	})

	it('закрылось меню — закрылись подменю всех уровней', () => {
		const { root, share } = tree()
		const deep = new TMenuSubmenu({ value: 'deep' })

		createEngineMenu({ owner: share, items: [deep] })

		share.open = true
		deep.open = true
		root.open = false

		expect(share.open).toBe(false)
		expect(deep.open).toBe(false)
	})

	it('закрылось подменю — меню над ним открыто: уровень закрывается один', () => {
		const { root, share } = tree()

		share.open = true
		share.open = false

		expect(root.open).toBe(true)
	})

	it('выбор в подменю закрывает меню целиком и сообщает choose — уже закрытым', () => {
		const { root, share, link, engine, shareEngine } = tree()
		const seen: string[] = []

		share.open = true

		engine.extensions.menu.events.on('choose', (item) =>
			seen.push(`меню ${String(item.value)} ${root.open} ${share.open}`),
		)
		shareEngine.extensions.menu.events.on('choose', (item) =>
			seen.push(`подменю ${String(item.value)} ${root.open} ${share.open}`),
		)

		expect(shareEngine.extensions.menu.chooseItem(link)).toBe(true)

		// Выбор доходит до каждого меню над подменю: корень узнаёт первым
		expect(seen).toEqual(['меню link false false', 'подменю link false false'])
	})

	it('выбор на втором уровне доходит до корня', () => {
		const { root, share, engine } = tree()
		const deep = new TMenuSubmenu({ value: 'deep' })
		const leaf = new TMenuItem({ value: 'leaf' })
		const chosen = vi.fn()

		const shareEngine = createEngineMenu({ owner: share, items: [deep] })
		const deepEngine = createEngineMenu({ owner: deep, items: [leaf] })

		share.open = true
		deep.open = true
		engine.extensions.menu.events.on('choose', chosen)

		deepEngine.extensions.menu.createItem(leaf).choose()

		expect(chosen).toHaveBeenCalledWith(leaf)
		expect([root.open, share.open, deep.open]).toEqual([false, false, false])
		expect(shareEngine.extensions.menu.opened).toBe(null)
	})

	it('выключенный пункт подменю не выбирается: никто не закрывается', () => {
		const { root, share, shareEngine } = tree()
		const off = new TMenuItem({ value: 'off', disabled: true })

		shareEngine.extensions.plain.push(off)
		share.open = true

		expect(shareEngine.extensions.menu.chooseItem(off)).toBe(false)
		expect([root.open, share.open]).toEqual([true, true])
	})

	it('флажок в подменю отмечается, меню открыты', () => {
		const { root, share } = tree()
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const { menu, selection } = createEngineMenu({ owner: share, items: [grid] }).extensions

		share.open = true

		expect(menu.toggleItem(grid)).toBe(true)
		expect(selection.selected).toEqual([grid])
		expect([root.open, share.open]).toEqual([true, true])
	})

	it('размер меню — подменю, а от подменю — его пунктам', () => {
		const { root, share, link } = tree()

		root.size = 'lg'

		expect(share.size).toBe('lg')
		expect(link.size).toBe('lg')
		expect(share.panelClasses.toArray()).toContain('so-menu__panel--size-lg')
	})

	/**
	 * Панель подменю телепортирована, и класс панели меню до её пунктов не
	 * доходит: вариант меню подменю получает от коллекции своим входом
	 * (`menuVariant`), а свои уровни — от него, вариантом его панели.
	 */
	describe('вариант меню', () => {
		/** «Поделиться → (Ссылка, Почта, Ещё → (Скопировать))»: третий уровень — в подменю. */
		function levels() {
			const { root, share, link, shareEngine } = tree()
			const more = new TMenuSubmenu({ value: 'more', text: 'Ещё' })
			const copy = new TMenuItem({ value: 'copy', text: 'Скопировать' })

			shareEngine.extensions.plain.push(more)
			createEngineMenu({ owner: more, items: [copy] })

			return { root, share, link, more, copy }
		}

		/** Модификаторы варианта набора классов. */
		const variants = (classes: TClasses) =>
			classes.toArray().filter((cls) => cls.includes('--variant-'))

		it('панелям подменю всех уровней — вариант меню, пунктам — нет', () => {
			const { root, share, link, more, copy } = levels()

			root.variant = 'brand'

			expect([share.menuVariant, more.menuVariant]).toEqual(['brand', 'brand'])
			expect(variants(share.panelClasses)).toEqual(['so-menu__panel--variant-brand'])
			expect(variants(more.panelClasses)).toEqual(['so-menu__panel--variant-brand'])
			// Свой вариант не пишется ни подменю, ни пунктам: их строки тема красит с панели
			for (const item of [share, link, more, copy]) {
				expect(item.variant).toBeUndefined()
				expect(variants(item.classes)).toEqual([])
			}

			root.variant = undefined

			expect([share.menuVariant, more.menuVariant]).toEqual([undefined, undefined])
			expect(variants(share.panelClasses)).toEqual([])
			expect(variants(more.panelClasses)).toEqual([])
		})

		it('свой вариант подменю сильнее варианта меню — и для уровней под ним', () => {
			const { root, share, more } = levels()
			const changed = vi.fn()

			root.variant = 'brand'
			share.variant = 'danger'

			expect(variants(share.panelClasses)).toEqual(['so-menu__panel--variant-danger'])
			expect(more.menuVariant).toBe('danger')
			expect(variants(more.panelClasses)).toEqual(['so-menu__panel--variant-danger'])

			share.events.on('change:panelVariant', changed)

			// Под своим вариантом подменю смена у меню не слышна
			root.variant = undefined
			root.variant = 'brand'

			expect(share.menuVariant).toBe('brand')
			expect(share.panelVariant).toBe('danger')
			expect(more.menuVariant).toBe('danger')
			expect(changed).not.toHaveBeenCalled()

			// Сняли свой — подменю и уровни под ним красятся вариантом меню
			share.variant = undefined

			expect(variants(share.panelClasses)).toEqual(['so-menu__panel--variant-brand'])
			expect(more.menuVariant).toBe('brand')
			expect(variants(more.panelClasses)).toEqual(['so-menu__panel--variant-brand'])
			expect(changed).toHaveBeenCalledOnce()
		})

		it('подменю, вставленное в меню с вариантом, получает его сразу', () => {
			const root = new TMenu({ variant: 'brand' })
			const { plain } = createEngineMenu({ owner: root }).extensions
			const share = new TMenuSubmenu({ value: 'share' })

			plain.push(share)

			expect(share.menuVariant).toBe('brand')
			expect(variants(share.panelClasses)).toEqual(['so-menu__panel--variant-brand'])
		})

		it('владелец пришёл позже — вариант его панели подменю получает догоном', () => {
			const share = new TMenuSubmenu({ value: 'share' })
			const engine = createEngineMenu({ items: [share] })

			expect(share.menuVariant).toBeUndefined()

			engine.options.set({ owner: new TMenu({ variant: 'danger' }) })

			expect(share.menuVariant).toBe('danger')
			expect(variants(share.panelClasses)).toEqual(['so-menu__panel--variant-danger'])
		})

		it('сменился владелец — вариант пишет новый, прежний больше не трогает', () => {
			const share = new TMenuSubmenu({ value: 'share' })
			const before = new TMenu({ variant: 'brand' })
			const after = new TMenu({ variant: 'danger' })
			const engine = createEngineMenu({ owner: before, items: [share] })

			engine.options.set({ owner: after })

			expect(share.menuVariant).toBe('danger')

			before.variant = undefined

			expect(share.menuVariant).toBe('danger')
		})
	})

	it('пункт с подменю, снятый из коллекции, меню больше не трогает', () => {
		const { root, share, send, engine } = tree()
		const chosen = vi.fn()

		engine.extensions.menu.events.on('choose', chosen)
		engine.extensions.plain.remove(share)

		share.open = true
		send.open = true
		share.notifyChoose(new TMenuItem({ value: 'x' }))
		root.variant = 'brand'

		expect(chosen).not.toHaveBeenCalled()
		expect(root.open).toBe(true)
		expect(share.menuVariant).toBeUndefined()
		expect(send.menuVariant).toBe('brand')
	})

	it('нажатие строки пункта с подменю — через item-адаптер: открывает', () => {
		const { share, engine } = tree()

		engine.extensions.menu.createItem(share).open()

		expect(share.open).toBe(true)
	})

	it('охранник menuOf находит расширение меню, у чужой коллекции — нет', () => {
		const { engine } = tree()

		expect(menuOf(engine)).toBe(engine.extensions.menu)
		expect(menuOf(createEngineSelection())).toBeUndefined()
		expect(menuOf(null)).toBeUndefined()
	})
})

describe('фасад подменю', () => {
	it('владелец — пункт с подменю: выбор в фасаде закрывает его и сообщает choose', () => {
		const share = new TMenuSubmenu({ open: true })
		const facade = new TMenuCollectionFacade(
			{ items: [{ value: 'link' }, { value: 'mail' }] },
			{ owner: share },
		)
		const choose = vi.fn()

		facade.events.on('choose', choose)
		facade.extensions.menu.chooseItem(itemOf(facade.items, 'link'))

		expect(choose).toHaveBeenCalledWith(itemOf(facade.items, 'link'))
		expect(share.open).toBe(false)
	})
})

/**
 * Подменю из данных — расширение коллекции `submenus`: пункт данными с
 * массивом `items` становится подменю, а его `items` — составом своего движка
 * меню. Подменю из записи (`ctrl`, `engine`) рисует разметка —
 * `ui/vue/__tests__/menu.spec.ts`, группа «подменю из данных».
 */
describe('коллекция меню · подменю из данных', () => {
	/** «Изменить · Поделиться → (Ссылка, Почта)» данными. */
	const SHARE: IMenuItemSource[] = [
		{ value: 'edit', text: 'Изменить' },
		{
			value: 'share',
			text: 'Поделиться',
			items: [
				{ value: 'link', text: 'Ссылка' },
				{ value: 'mail', text: 'Почта' },
			],
		},
	]

	/** Те же пункты: «Изменить» с вложенным составом, у «Поделиться» другой текст и состав. */
	const RESHARE: IMenuItemSource[] = [
		{ value: 'edit', text: 'Изменить', items: [{ value: 'copy', text: 'Копировать' }] },
		{
			value: 'share',
			text: 'Отправить',
			items: [
				{ value: 'link', text: 'Ссылкой' },
				{ value: 'sms', text: 'СМС' },
			],
		},
	]

	/** Запись подменю по пункту; нет её — тест падает здесь. */
	function entryOf(entries: TMenuSubmenuEntries, item: IMenuItem): TMenuSubmenuEntry {
		const entry = entries.get(item)

		if (!entry) throw new Error(`у пункта «${String(item.value)}» записи подменю нет`)

		return entry
	}

	/** Запись подменю по пути `value` от движка вниз по уровням. */
	function submenuAt(engine: TMenuCollection, ...path: string[]): TMenuSubmenuEntry {
		const [head, ...rest] = path
		const { batch, submenus } = engine.extensions
		const entry = entryOf(submenus.entries, itemOf(batch.items, head))

		return rest.length > 0 ? submenuAt(entry.engine, ...rest) : entry
	}

	it('пункт с items — подменю, а его items — состав своего движка меню', () => {
		const engine = createEngineMenu({ items: SHARE })
		const { batch, submenus } = engine.extensions
		const share = itemOf(batch.items, 'share')
		const edit = itemOf(batch.items, 'edit')
		const { ctrl, engine: nested } = entryOf(submenus.entries, share)

		expect(share).toBeInstanceOf(TMenuSubmenu)
		expect(ctrl).toBe(share)
		expect(share.text).toBe('Поделиться')
		expect(edit).not.toBeInstanceOf(TMenuSubmenu)
		expect(submenus.entries.has(edit)).toBe(false)
		// Вложенный состав — в движке, у пункта своего `items` нет
		expect(Object.hasOwn(share, 'items')).toBe(false)
		expect(values(nested.extensions.batch.items)).toEqual(['link', 'mail'])
		expect(nested.extensions.batch.items.every((item) => item instanceof TMenuItem)).toBe(true)
		// Движок пунктов — движок меню: отметки флажков независимы
		expect(nested).not.toBe(engine)
		expect(nested.extensions.selection.mode).toBe('multiple')
		// Владельца пишет фасад смонтированного подменю, а не коллекция
		expect(nested.options.get('owner')).toBeUndefined()
	})

	it('пустой items — тоже подменю: пункты придут потом', () => {
		const { batch, submenus } = createEngineMenu({
			items: [{ value: 'recent', text: 'Недавние', items: [] }],
		}).extensions
		const recent = itemOf(batch.items, 'recent')

		expect(recent).toBeInstanceOf(TMenuSubmenu)
		expect(entryOf(submenus.entries, recent).engine.extensions.batch.items).toEqual([])
	})

	it('состав и вложенный — только для чтения: уходят в движки без копии', () => {
		// Заморожены оба уровня: запись в любой бросила бы `TypeError`, а тип
		// замороженного — `readonly T[]`, как у данных, объявленных константой
		const share: readonly IMenuItemSource[] = Object.freeze([
			{
				value: 'share',
				text: 'Поделиться',
				items: Object.freeze([
					{ value: 'link', text: 'Ссылка' },
					{ value: 'mail', text: 'Почта' },
				]),
			},
		])
		const reshare: readonly IMenuItemSource[] = Object.freeze([
			{ value: 'share', items: Object.freeze([{ value: 'sms', text: 'СМС' }]) },
		])
		const engine = createEngineMenu({ items: share })
		const { batch } = engine.extensions

		expect(values(submenuAt(engine, 'share').engine.extensions.batch.items)).toEqual([
			'link',
			'mail',
		])

		// Патч по ключу несёт вложенный состав в движок подменю тем же видом
		batch.trackBy = (item) => item.value
		batch.items = reshare

		expect(values(submenuAt(engine, 'share').engine.extensions.batch.items)).toEqual(['sms'])
	})

	it('третий уровень из данных — подменю в подменю, со своим движком', () => {
		const engine = createEngineMenu({
			items: [
				{
					value: 'share',
					items: [
						{ value: 'mail' },
						{
							value: 'messengers',
							items: [{ value: 'telegram' }, { value: 'whatsapp' }],
						},
					],
				},
			],
		})
		const messengers = submenuAt(engine, 'share', 'messengers')

		expect(messengers.ctrl).toBeInstanceOf(TMenuSubmenu)
		expect(values(submenuAt(engine, 'share').engine.extensions.batch.items)).toEqual([
			'mail',
			'messengers',
		])
		expect(values(messengers.engine.extensions.batch.items)).toEqual(['telegram', 'whatsapp'])
	})

	/** Владельцев движкам подменю пишут фасады смонтированных `Menu.Submenu` — здесь кодом. */
	it('выбор на третьем уровне закрывает меню целиком и доходит до корня; размер меню — всем уровням', () => {
		const root = new TMenu({ open: true, size: 'lg' })
		const engine = createEngineMenu({
			owner: root,
			items: [
				{
					value: 'share',
					items: [{ value: 'messengers', items: [{ value: 'telegram' }] }],
				},
			],
		})
		const share = submenuAt(engine, 'share')
		const messengers = submenuAt(engine, 'share', 'messengers')
		const telegram = itemOf(messengers.engine.extensions.batch.items, 'telegram')
		const chosen = vi.fn()

		new TMenuCollectionFacade({}, { owner: share.ctrl, engine: share.engine }).bindOwner()
		new TMenuCollectionFacade(
			{},
			{ owner: messengers.ctrl, engine: messengers.engine },
		).bindOwner()

		expect(share.engine.options.get('owner')).toBe(share.ctrl)
		expect(telegram.size).toBe('lg')

		share.ctrl.open = true
		messengers.ctrl.open = true
		engine.extensions.menu.events.on('choose', chosen)

		expect(messengers.engine.extensions.menu.chooseItem(telegram)).toBe(true)
		expect(chosen).toHaveBeenCalledWith(telegram)
		expect([root.open, share.ctrl.open, messengers.ctrl.open]).toEqual([false, false, false])
	})

	it('вариант меню — панелям подменю из данных всех уровней; свой вариант из патча сильнее', () => {
		const nested: IMenuItemSource[] = [{ value: 'messengers', items: [{ value: 'telegram' }] }]
		const patched: IMenuItemSource[] = [{ value: 'share', variant: 'danger', items: nested }]
		const root = new TMenu({ variant: 'brand' })
		const engine = createEngineMenu({ owner: root, items: [{ value: 'share', items: nested }] })
		const { batch } = engine.extensions
		const share = submenuAt(engine, 'share')
		const messengers = submenuAt(engine, 'share', 'messengers')

		// Владельца движку подменю пишет фасад смонтированного `Menu.Submenu`
		new TMenuCollectionFacade({}, { owner: share.ctrl, engine: share.engine }).bindOwner()

		expect(share.ctrl.menuVariant).toBe('brand')
		expect(messengers.ctrl.menuVariant).toBe('brand')
		expect(messengers.ctrl.panelClasses.toArray()).toContain('so-menu__panel--variant-brand')

		batch.trackBy = (item) => item.value
		batch.patch(patched)

		// Патч правит подменю на месте: свой вариант — из данных, вариант меню — прежний
		expect(submenuAt(engine, 'share', 'messengers').ctrl).toBe(messengers.ctrl)
		expect(share.ctrl.variant).toBe('danger')
		expect(share.ctrl.menuVariant).toBe('brand')
		expect(share.ctrl.panelVariant).toBe('danger')
		expect(messengers.ctrl.menuVariant).toBe('danger')
		expect(messengers.ctrl.panelClasses.toArray()).toContain('so-menu__panel--variant-danger')

		root.variant = undefined

		expect(share.ctrl.menuVariant).toBeUndefined()
		expect(messengers.ctrl.menuVariant).toBe('danger')
	})

	it('патч по trackBy: тот же пункт, запись и движок, вложенный состав — патчем; своего items у пунктов нет', () => {
		const engine = createEngineMenu()
		const { batch, submenus } = engine.extensions
		const announced = vi.fn()

		batch.trackBy = (item) => item.value
		batch.items = SHARE

		const share = itemOf(batch.items, 'share')
		const edit = itemOf(batch.items, 'edit')
		const entry = entryOf(submenus.entries, share)
		const link = itemOf(entry.engine.extensions.batch.items, 'link')

		submenus.events.on('change:submenus', announced)

		batch.items = RESHARE

		expect(itemOf(batch.items, 'share')).toBe(share)
		expect(share.text).toBe('Отправить')
		expect(submenus.entries.get(share)).toBe(entry)
		// Вложенный движок сверяет тем же ключом: «Ссылка» — тот же пункт
		expect(itemOf(entry.engine.extensions.batch.items, 'link')).toBe(link)
		expect(link.text).toBe('Ссылкой')
		expect(values(entry.engine.extensions.batch.items)).toEqual(['link', 'sms'])
		// Вид пункта решила вставка: из действия патч подменю не сделал
		expect(itemOf(batch.items, 'edit')).toBe(edit)
		expect(edit).not.toBeInstanceOf(TMenuSubmenu)
		expect(submenus.entries.has(edit)).toBe(false)
		// Вложенный состав в пункт не записан — ни подменю, ни действию
		expect(Object.hasOwn(share, 'items')).toBe(false)
		expect(Object.hasOwn(edit, 'items')).toBe(false)
		// Подменю не пришло и не ушло
		expect(announced).not.toHaveBeenCalled()
	})

	it('trackBy движкам подменю — свой: новому при сборке, всем уровням — на смену', () => {
		const engine = createEngineMenu({
			items: [{ value: 'share', items: [{ value: 'messengers', items: [] }] }],
		})
		const { batch, plain } = engine.extensions
		const more: IMenuItemSource = { value: 'more', items: [] }

		batch.trackBy = (item) => item.value

		const trackBy = batch.trackBy

		expect(submenuAt(engine, 'share').engine.extensions.batch.trackBy).toBe(trackBy)
		expect(submenuAt(engine, 'share', 'messengers').engine.extensions.batch.trackBy).toBe(
			trackBy,
		)

		plain.push(more)

		expect(submenuAt(engine, 'more').engine.extensions.batch.trackBy).toBe(trackBy)

		batch.trackBy = undefined

		expect(
			submenuAt(engine, 'share', 'messengers').engine.extensions.batch.trackBy,
		).toBeUndefined()
	})

	it('trackBy из пропсов фасада доходит до движков подменю, хотя фасад кладёт его после состава', () => {
		const trackBy = (item: { value?: unknown }) => item.value
		const facade = new TMenuCollectionFacade({ items: SHARE, trackBy }, { owner: new TMenu() })

		expect(
			entryOf(facade.submenus, itemOf(facade.items, 'share')).engine.extensions.batch.trackBy,
		).toBe(trackBy)
	})

	it('замена без trackBy — новые подменю с новыми движками; снятое подменю уходит из записей', () => {
		const engine = createEngineMenu({ items: SHARE })
		const { batch, plain, submenus } = engine.extensions
		const before = itemOf(batch.items, 'share')
		const { engine: replaced } = entryOf(submenus.entries, before)

		batch.items = [...SHARE]

		const after = itemOf(batch.items, 'share')
		const entry = entryOf(submenus.entries, after)

		expect(after).not.toBe(before)
		expect(submenus.entries.has(before)).toBe(false)
		expect(entry.engine).not.toBe(replaced)
		expect(values(entry.engine.extensions.batch.items)).toEqual(['link', 'mail'])

		plain.remove(after)

		expect(submenus.entries.size).toBe(0)
	})

	it('change:submenus — раз на запись и только когда подменю пришло или ушло; снимок на смену новый', () => {
		const engine = createEngineMenu()
		const { batch, plain, submenus } = engine.extensions
		const announced = vi.fn()
		const keys = () => values([...submenus.entries.keys()])
		const empty = submenus.entries
		const filled: IMenuItemSource[] = [
			{ value: 'a', items: [] },
			{ value: 'b', items: [] },
			{ value: 'c' },
		]
		const pushed: IMenuItemSource = { value: 'e', items: [] }
		const dropped: IMenuItemSource = { value: 'f', items: [] }

		submenus.events.on('change:submenus', announced)

		batch.set(filled)

		expect(announced).toHaveBeenCalledOnce()
		expect(announced).toHaveBeenLastCalledWith(submenus.entries)
		expect(submenus.entries).not.toBe(empty)
		expect(keys()).toEqual(['a', 'b'])

		const snapshot = submenus.entries

		// Действие — не подменю: ни события, ни нового снимка
		plain.push({ value: 'd' })

		expect(announced).toHaveBeenCalledOnce()
		expect(submenus.entries).toBe(snapshot)

		// Одна запись — одно событие, сколько бы подменю она ни задела
		engine.batch(() => {
			plain.remove(itemOf(batch.items, 'a'))
			plain.push(pushed)
		})

		expect(announced).toHaveBeenCalledTimes(2)
		expect(keys()).toEqual(['b', 'e'])
		expect(submenus.entries).not.toBe(snapshot)

		// Пришло и ушло в одной записи — состав подменю прежний, события нет
		engine.batch(() => plain.remove(plain.push(dropped)))

		expect(announced).toHaveBeenCalledTimes(2)
		expect(keys()).toEqual(['b', 'e'])
	})

	it('отменённая вставка движка не оставляет; отменённый патч вложенный состав не трогает', () => {
		const engine = createEngineMenu()
		const { batch, plain, submenus } = engine.extensions
		const { events } = engine.getCore().driver
		const announced = vi.fn()
		const converted: boolean[] = []
		// Отменяет подписчик после расширения: пункт уже стал подменю
		const vetoInsert = (e: TInsertEvent<IMenuItem>) => {
			converted.push(isMenuSubmenu(e.item))
			e.preventDefault()
		}
		const vetoUpdate = (e: TUpdateEvent<IMenuItem>) => e.preventDefault()

		submenus.events.on('change:submenus', announced)

		events.on('item:add:before', vetoInsert)
		plain.push(SHARE[1])
		events.off('item:add:before', vetoInsert)

		expect(converted).toEqual([true])
		expect(batch.items).toEqual([])
		expect(submenus.entries.size).toBe(0)
		expect(announced).not.toHaveBeenCalled()

		batch.trackBy = (item) => item.value
		batch.items = SHARE

		const share = itemOf(batch.items, 'share')
		const { engine: nested } = entryOf(submenus.entries, share)

		events.on('item:update:before', vetoUpdate)
		batch.items = RESHARE
		events.off('item:update:before', vetoUpdate)

		expect(share.text).toBe('Поделиться')
		expect(values(nested.extensions.batch.items)).toEqual(['link', 'mail'])
	})

	it('движок снаружи: фасад доставляет подменю, и данные, лежавшие в нём до того, становятся подменю', () => {
		const engine = createEngineSelection({ items: SHARE })
		const facade = new TMenuCollectionFacade({}, { owner: new TMenu(), engine })
		const share = itemOf(facade.items, 'share')

		expect(share).toBeInstanceOf(TMenuSubmenu)
		expect(itemOf(facade.items, 'edit')).toBeInstanceOf(TMenuItem)
		expect(values(entryOf(facade.submenus, share).engine.extensions.batch.items)).toEqual([
			'link',
			'mail',
		])
	})
})

describe('фасад меню · подменю из данных', () => {
	it('submenus — проекция расширения, change:submenus — пробросом', () => {
		const facade = new TMenuCollectionFacade({}, { owner: new TMenu() })
		const announced = vi.fn()
		const recent: IMenuItemSource = { value: 'recent', items: [] }

		facade.events.on('change:submenus', announced)
		facade.extensions.plain.push(recent)

		expect(facade.submenus).toBe(facade.extensions.submenus.entries)
		expect(facade.submenus.size).toBe(1)
		expect(announced).toHaveBeenCalledOnce()
		expect(announced).toHaveBeenLastCalledWith(facade.submenus)
	})
})

/**
 * Пункт с панелью — `Menu.PopoverItem`: строка открывает сбоку немодальную
 * панель-диалог с любым содержимым. Здесь — то, что пункт знает о себе, и что
 * коллекция меню делает с его панелью: открыта одна панель на меню, какого бы
 * вида ни был пункт, и закрытое меню закрывает её. Фокус, клавиши и связки —
 * плагины (`plugins/__tests__/menu-popover-item.plugin.spec.ts`).
 */
describe('TMenuPopoverItem · пункт', () => {
	it('пункт меню с ролью menuitem: объявляет диалог и закрыт', () => {
		const due = new TMenuPopoverItem({ value: 'due', text: 'Срок' })

		expect(due).toBeInstanceOf(TMenuItem)
		expect(isMenuPopoverItem(due)).toBe(true)
		expect(isMenuPopupItem(due)).toBe(true)
		expect(isMenuSubmenu(due)).toBe(false)
		expect(isMenuPopoverItem(new TMenuItem())).toBe(false)
		expect(isMenuPopupItem(new TMenuItem())).toBe(false)
		expect(due.open).toBe(false)
		expect(due.checkable).toBe(false)
		expect(due.tag).toBe('div')
		expect(due.classes.toArray()).toContain('so-menu-item')
		expect(due.aria.toObject()).toEqual({
			role: 'menuitem',
			// `dialog`, а не `true`: `true` у ARIA значит `menu`
			'aria-haspopup': 'dialog',
			'aria-expanded': 'false',
		})
		expect(due.dataset.get('open')).toBe('false')
	})

	it('открытость — aria-expanded на строке и data-open для темы', () => {
		const due = new TMenuPopoverItem({ open: true })

		expect(due.aria.get('aria-expanded')).toBe('true')
		expect(due.dataset.get('open')).toBe('true')
		expect(due.getProps()).toMatchObject({ open: true, lazyMount: false })

		due.open = false

		expect(due.aria.get('aria-expanded')).toBe('false')
		expect(due.dataset.get('open')).toBe('false')
	})

	it('change:open — только на смену', () => {
		const due = new TMenuPopoverItem()
		const handler = vi.fn()

		due.events.on('change:open', handler)
		due.open = false
		due.open = true
		due.open = true

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith(true)
	})

	// `id` и ссылки ядро не пишет: их пишет плагин связок (plugins, ids.plugin.spec)
	it('панель — диалог, без id; набор панели живой', () => {
		const due = new TMenuPopoverItem()
		const handler = vi.fn()

		expect(due.panelAria.toObject()).toEqual({ role: 'dialog' })

		due.events.on('change:panelAria', handler)
		due.panelAria.add('id', 'x')

		expect(handler).toHaveBeenCalledWith({ role: 'dialog', id: 'x' })
	})

	it('без lazyMount содержимое смонтировано всегда', () => {
		const due = new TMenuPopoverItem()

		expect(due.lazyMount).toBe(false)
		expect(due.contentRendered).toBe(true)
	})

	it('lazyMount: содержимое — с первого открытия, закрытие его не снимает', () => {
		const due = new TMenuPopoverItem({ lazyMount: true })

		expect(due.contentRendered).toBe(false)

		due.open = true

		expect(due.contentRendered).toBe(true)

		due.open = false

		expect(due.contentRendered).toBe(true)
	})

	it('lazyMount у открытого со старта: содержимое уже смонтировано', () => {
		const due = new TMenuPopoverItem({ lazyMount: true, open: true })

		expect(due.contentRendered).toBe(true)
	})

	it('снятый lazyMount монтирует содержимое; change:lazyMount — только на смену', () => {
		const due = new TMenuPopoverItem({ lazyMount: true })
		const handler = vi.fn()

		due.events.on('change:lazyMount', handler)
		due.lazyMount = true
		due.lazyMount = false

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenCalledWith(false)
		expect(due.contentRendered).toBe(true)
		expect(due.getProps()).toMatchObject({ lazyMount: false })
	})
})

describe('коллекция меню · пункт с панелью', () => {
	/**
	 * Меню «Изменить · Срок → (календарь) · Поделиться → (Ссылка)»: пункт с
	 * панелью рядом с подменю — так их собирает разметка.
	 */
	function tree() {
		const root = new TMenu({ open: true })
		const edit = new TMenuItem({ value: 'edit', text: 'Изменить' })
		const due = new TMenuPopoverItem({ value: 'due', text: 'Срок' })
		const share = new TMenuSubmenu({ value: 'share', text: 'Поделиться' })
		const engine = createEngineMenu({ owner: root, items: [edit, due, share] })

		createEngineMenu({ owner: share, items: [new TMenuItem({ value: 'link' })] })

		return { root, edit, due, share, engine }
	}

	it('пункт с панелью, пришедший готовым, остаётся им и вне обхода Tab', () => {
		const { edit, due, share, engine } = tree()

		expect(engine.extensions.batch.items).toEqual([edit, due, share])
		expect(due.aria.get('tabindex')).toBe('-1')
	})

	it('openItem открывает панель, выключенному — отказ; открытый — opened меню', () => {
		const { due, engine } = tree()
		const { menu } = engine.extensions

		expect(menu.openItem(due)).toBe(true)
		expect(due.open).toBe(true)
		expect(menu.opened).toBe(due)

		// Открывает, а не переключает: открытую панель клик по строке не закроет
		expect(menu.openItem(due)).toBe(true)
		expect(due.open).toBe(true)

		const off = new TMenuPopoverItem({ value: 'off', disabled: true })

		engine.extensions.plain.push(off)

		expect(menu.openItem(off)).toBe(false)
		expect(off.open).toBe(false)
	})

	it('пункт с панелью — не действие: chooseItem ему отказывает, меню открыто', () => {
		const { root, due, engine } = tree()
		const choose = vi.fn()

		engine.extensions.menu.events.on('choose', choose)

		expect(engine.extensions.menu.chooseItem(due)).toBe(false)
		expect(root.open).toBe(true)
		expect(choose).not.toHaveBeenCalled()
	})

	it('открыта одна панель на меню: пункт с панелью и подменю закрывают друг друга', () => {
		const { due, share, engine } = tree()
		const { menu } = engine.extensions

		menu.openItem(share)
		menu.openItem(due)

		expect([due.open, share.open]).toEqual([true, false])
		expect(menu.opened).toBe(due)

		// И из кода тоже
		share.open = true

		expect([due.open, share.open]).toEqual([false, true])
		expect(menu.opened).toBe(share)
	})

	it('закрылось меню — закрылась панель пункта; закрылась она — меню открыто', () => {
		const { root, due } = tree()

		due.open = true
		due.open = false

		expect(root.open).toBe(true)

		due.open = true
		root.open = false

		expect(due.open).toBe(false)
	})

	it('пункт с панелью в подменю: закрытое меню закрывает и его', () => {
		const { root, share } = tree()
		const deep = new TMenuPopoverItem({ value: 'deep' })

		createEngineMenu({ owner: share, items: [deep] })

		share.open = true
		deep.open = true
		root.open = false

		expect([share.open, deep.open]).toEqual([false, false])
	})

	it('пункт с панелью, снятый из коллекции, меню больше не трогает', () => {
		const { due, share, engine } = tree()

		engine.extensions.plain.remove(due)

		due.open = true
		share.open = true

		expect(due.open).toBe(true)
		expect(engine.extensions.menu.opened).toBe(share)
	})

	it('нажатие строки пункта с панелью — через item-адаптер: открывает', () => {
		const { due, engine } = tree()

		engine.extensions.menu.createItem(due).open()

		expect(due.open).toBe(true)
	})

	it('размер меню — пункту с панелью, вариант — свой', () => {
		const { root, due } = tree()

		due.variant = 'danger'
		root.size = 'lg'

		expect(due.size).toBe('lg')
		expect(due.variant).toBe('danger')
	})
})

/**
 * Группы пунктов — расширение коллекции `group`: показанное идёт по группам,
 * и стрелки, которые ходят по показанному, идут тем же порядком, что экран.
 * Разметку групп и разделителей проверяет `ui/vue/__tests__/menu.spec.ts`.
 */
describe('коллекция меню · группы', () => {
	it('у createEngineMenu: показанное по группам, секции с подписью', () => {
		const { batch, group } = createEngineMenu({ items: GROUPED }).extensions

		group.groups = EDIT

		expect(values(batch.shown)).toEqual(['cut', 'copy', 'rename'])
		expect(values(batch.items)).toEqual(['cut', 'rename', 'copy'])
		expect(brief(group.sections)).toEqual([
			['group:edit', 'Правка', ['cut', 'copy']],
			['free', null, ['rename']],
		])
	})

	it('движок снаружи: фасад доставляет группировку, метки из данных доезжают', () => {
		const engine = createEngineSelection({ items: GROUPED })
		const facade = new TMenuCollectionFacade({ groups: EDIT }, { owner: new TMenu(), engine })

		expect(engine.extensions.group).toBe(facade.extensions.group)
		expect(values(facade.shown)).toEqual(['cut', 'copy', 'rename'])
		expect(brief(facade.sections)).toEqual([
			['group:edit', 'Правка', ['cut', 'copy']],
			['free', null, ['rename']],
		])
	})
})

describe('фасад меню · группы', () => {
	it('groupBy, groups и sections — проекция расширения, change:sections — пробросом', () => {
		const facade = new TMenuCollectionFacade(
			{ items: [{ value: 'a' }, { value: 'b' }] },
			{ owner: new TMenu() },
		)
		const sections = vi.fn()
		const by = (item: IMenuItem) => (item.value === 'b' ? 'first' : undefined)

		facade.events.on('change:sections', sections)

		facade.groupBy = by
		facade.groups = [{ key: 'first', label: 'Первая' }]

		expect(facade.extensions.group.groupBy).toBe(by)
		expect(facade.groupBy).toBe(by)
		expect(facade.groups).toEqual([{ key: 'first', label: 'Первая' }])
		expect(values(facade.shown)).toEqual(['b', 'a'])
		expect(facade.sections).toBe(facade.extensions.group.sections)
		expect(brief(facade.sections)).toEqual([
			['group:first', 'Первая', ['b']],
			['free', null, ['a']],
		])
		expect(sections).toHaveBeenLastCalledWith(facade.sections)
	})

	it('пропсы конструктора: группировка — до состава', () => {
		const facade = new TMenuCollectionFacade(
			{
				items: [{ value: 'a' }, { value: 'b' }, { value: 'c' }],
				groupBy: (item) => (item.value === 'a' ? undefined : 'rest'),
				groups: [{ key: 'rest', label: 'Остальное' }],
			},
			{ owner: new TMenu() },
		)

		expect(values(facade.shown)).toEqual(['b', 'c', 'a'])
		expect(brief(facade.sections)).toEqual([
			['group:rest', 'Остальное', ['b', 'c']],
			['free', null, ['a']],
		])
	})

	it('движок снаружи свою группировку не теряет: незаданное и пустое не применяется', () => {
		const engine = createEngineMenu({ items: GROUPED })
		const by = (item: IMenuItem) => (item.value === 'rename' ? 'edit' : undefined)

		engine.extensions.group.groups = EDIT
		engine.extensions.group.groupBy = by

		new TMenuCollectionFacade({ groups: [] }, { owner: new TMenu(), engine })

		expect(engine.extensions.group.groups).toEqual(EDIT)
		expect(engine.extensions.group.groupBy).toBe(by)
	})
})

/**
 * Переключатели: отметка — тот же выбор коллекции `multiple`, что у флажка, а
 * правило «в группе отмечен один» и связь значения группы с отметкой держит
 * расширение меню. Группа в коллекцию не входит: её переключатели — пункты
 * меню. Лифт группы до пункта — `setup/__tests__/menu-radio.spec.ts`,
 * разметка — `ui/vue/__tests__/menu.spec.ts`.
 */
describe('переключатель и группа переключателей', () => {
	it('переключатель — menuitemradio, отмечается, и он пункт; группы нет', () => {
		const item = new TMenuRadioItem({ value: 'name', text: 'По имени' })

		expect(item.aria.get('role')).toBe('menuitemradio')
		expect(item.checkable).toBe(true)
		expect(item).toBeInstanceOf(TMenuItem)
		expect(item.classes.toArray()).toContain('so-menu-item')
		expect(item.group).toBeNull()
		expect(isMenuRadioItem(item)).toBe(true)
		expect(isMenuRadioItem(new TMenuCheckboxItem())).toBe(false)
	})

	it('группа переключателя — из конструктора и кодом; change:group — только на смену', () => {
		const sort = new TMenuRadioGroup()
		const view = new TMenuRadioGroup()
		const item = new TMenuRadioItem({ value: 'name', group: sort })
		const changed = vi.fn()

		item.events.on('change:group', changed)

		item.group = sort
		item.group = view

		expect(item.group).toBe(view)
		expect(item.getProps().group).toBe(view)
		expect(changed).toHaveBeenCalledOnce()
		expect(changed).toHaveBeenCalledWith(view)
	})

	it('группа переключателей — группа меню с подписью; роль group, а не radiogroup', () => {
		const sort = new TMenuRadioGroup({ label: 'Сортировка' })

		expect(sort).toBeInstanceOf(TMenuGroup)
		expect(sort.aria.get('role')).toBe('group')
		expect(sort.label).toBe('Сортировка')
		expect(sort.classes.toArray()).toContain('so-menu-group')
		expect(sort.value).toBeNull()
	})

	it('значение — из конструктора; change:value — только на смену, с прежним', () => {
		const sort = new TMenuRadioGroup({ value: 'name' })
		const changed = vi.fn()

		sort.events.on('change:value', changed)

		sort.value = 'name'
		sort.value = 'date'
		sort.value = null

		expect(sort.getProps().value).toBeNull()
		expect(changed.mock.calls).toEqual([
			[{ newValue: 'date', oldValue: 'name' }],
			[{ newValue: null, oldValue: 'date' }],
		])
	})
})

/** Меню «Сортировка: по имени, по дате» — переключатели одной группы. */
function sortMenu(value: TMenuRadioGroupValue = null) {
	const owner = new TMenu({ open: true })
	const sort = new TMenuRadioGroup({ label: 'Сортировка', value })
	const name = new TMenuRadioItem({ value: 'name', text: 'По имени', group: sort })
	const date = new TMenuRadioItem({ value: 'date', text: 'По дате', group: sort })
	const engine = createEngineMenu({ owner, items: [name, date] })

	return { owner, sort, name, date, engine, ...engine.extensions }
}

describe('коллекция меню · переключатели', () => {
	it('в группе отмечен один: нажатие переносит отметку, меню открыто, choose нет', () => {
		const { owner, sort, name, date, menu, selection } = sortMenu()
		const choose = vi.fn()

		menu.events.on('choose', choose)

		expect(menu.checkItem(name)).toBe(true)
		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')

		expect(menu.checkItem(date)).toBe(true)
		expect(selection.selected).toEqual([date])
		expect(sort.value).toBe('date')

		expect(owner.open).toBe(true)
		expect(choose).not.toHaveBeenCalled()
	})

	it('нажатие отмеченного отметку не снимает', () => {
		const { sort, name, menu, selection } = sortMenu('name')

		expect(menu.checkItem(name)).toBe(true)
		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')
	})

	it('значение группы — за отметкой, отметка — за значением', () => {
		const { sort, name, date, selection } = sortMenu('name')
		const values: unknown[] = []

		sort.events.on('change:value', ({ newValue }) => values.push(newValue))

		expect(selection.selected).toEqual([name])

		sort.value = 'date'

		expect(selection.selected).toEqual([date])

		selection.select(name)

		expect(selection.selected).toEqual([name])
		expect(values).toEqual(['date', 'name'])
	})

	it('значения нет среди переключателей — не отмечен ни один, и значение ждёт', () => {
		const { sort, selection } = sortMenu('name')

		sort.value = 'size'

		expect(selection.selected).toEqual([])
		expect(sort.value).toBe('size')

		sort.value = null

		expect(selection.selected).toEqual([])
	})

	/** Так переключатель разметки входит в меню: при монтировании, после того как задали значение. */
	it('пришёл переключатель со значением группы — отмечен', () => {
		const sort = new TMenuRadioGroup({ value: 'date' })
		const { plain, selection } = createEngineMenu().extensions
		const name = new TMenuRadioItem({ value: 'name', group: sort })
		const date = new TMenuRadioItem({ value: 'date', group: sort })

		plain.push(name)

		expect(selection.selected).toEqual([])

		plain.push(date)

		expect(selection.selected).toEqual([date])
		expect(date.aria.get('aria-checked')).toBe('true')
		expect(sort.value).toBe('date')
	})

	it('две группы одного меню независимы, флажки — сами по себе', () => {
		const sort = new TMenuRadioGroup()
		const order = new TMenuRadioGroup()
		const name = new TMenuRadioItem({ value: 'name', group: sort })
		const date = new TMenuRadioItem({ value: 'date', group: sort })
		const asc = new TMenuRadioItem({ value: 'asc', group: order })
		const desc = new TMenuRadioItem({ value: 'desc', group: order })
		const grid = new TMenuCheckboxItem({ value: 'grid' })
		const { menu, selection } = createEngineMenu({
			items: [name, date, asc, desc, grid],
		}).extensions

		menu.toggleItem(grid)
		menu.checkItem(name)
		menu.checkItem(desc)
		menu.checkItem(date)

		expect(selection.selected).toEqual([grid, desc, date])
		expect([sort.value, order.value]).toEqual(['date', 'desc'])

		order.value = 'asc'

		expect(selection.selected).toEqual([grid, date, asc])
		expect(sort.value).toBe('date')
	})

	it('переключатели без группы отмечаются каждый сам по себе', () => {
		const one = new TMenuRadioItem({ value: 'one' })
		const two = new TMenuRadioItem({ value: 'two' })
		const { menu, selection } = createEngineMenu({ items: [one, two] }).extensions

		menu.checkItem(one)
		menu.checkItem(two)

		expect(selection.selected).toEqual([one, two])
	})

	it('выключенный переключатель не отмечается', () => {
		const { sort, name, date, menu, selection } = sortMenu('name')

		date.disabled = true

		expect(menu.checkItem(date)).toBe(false)
		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')
	})

	it('aria-checked — у всех переключателей, по отметке', () => {
		const { name, date, menu } = sortMenu()
		const checked = () => [name, date].map((item) => item.aria.get('aria-checked'))

		expect(checked()).toEqual(['false', 'false'])

		menu.checkItem(date)

		expect(checked()).toEqual(['false', 'true'])
		expect(date.dataset.get('selected')).toBe('true')

		menu.checkItem(name)

		expect(checked()).toEqual(['true', 'false'])
		expect(date.dataset.get('selected')).toBe('false')
	})

	it('отметку кодом сняли с переключателя в коллекции — значение группы null', () => {
		const { sort, name, selection } = sortMenu('name')

		selection.deselect(name)

		expect(sort.value).toBeNull()
	})

	it('ушедший отмеченный значения не трогает, вернувшийся снова отмечен', () => {
		const { sort, name, plain, selection } = sortMenu('name')

		plain.remove(name)

		expect(selection.selected).toEqual([])
		expect(sort.value).toBe('name')

		plain.push(name)

		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')
	})

	it('отмена в item:select:before: нажатие не отмечает, значение кодом откатывается', () => {
		const { sort, name, date, menu, selection } = sortMenu('name')

		selection.events.on('item:select:before', (e) => {
			if (e.item === date) e.preventDefault()
		})

		expect(menu.checkItem(date)).toBe(false)
		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')

		sort.value = 'date'

		expect(selection.selected).toEqual([name])
		expect(sort.value).toBe('name')
	})

	it('отменённая отметка пришедшего переключателя откатывает значение к null', () => {
		const sort = new TMenuRadioGroup({ value: 'date' })
		const date = new TMenuRadioItem({ value: 'date', group: sort })
		const { plain, selection } = createEngineMenu().extensions

		selection.events.on('item:select:before', (e) => e.preventDefault())

		plain.push(date)

		expect(selection.selected).toEqual([])
		expect(sort.value).toBeNull()
	})

	it('отметка из разметки (`meta`) — новая в группе: значение за ней', () => {
		const { sort, date, meta, selection } = sortMenu('name')

		meta.apply(date, { selected: true })

		expect(selection.selected).toEqual([date])
		expect(sort.value).toBe('date')
	})

	it('нажатие — через item-адаптер пункта', () => {
		const { sort, date, menu, selection } = sortMenu('name')

		menu.createItem(date).check()

		expect(selection.selected).toEqual([date])
		expect(sort.value).toBe('date')
	})

	it('переключатель, перешедший в другую группу, — как пришедший в неё', () => {
		const { sort, name, date, selection } = sortMenu('name')
		const view = new TMenuRadioGroup({ value: 'list' })

		date.group = view

		// Значение новой группы — не его: не отмечен
		expect(selection.selected).toEqual([name])
		expect(view.value).toBe('list')

		name.group = view

		// Отмеченный — новый в группе: значение группы — его. Прежняя группа
		// значения не меняет, как от ушедшего, и меню за ней больше не следит
		expect(selection.selected).toEqual([name])
		expect(view.value).toBe('name')
		expect(sort.value).toBe('name')

		sort.value = 'date'

		expect(selection.selected).toEqual([name])

		view.value = 'date'

		expect(selection.selected).toEqual([date])
	})

	it('подписка на группу живёт, пока в коллекции есть её переключатель', () => {
		const sort = new TMenuRadioGroup()
		const on = vi.spyOn(sort.events, 'on')
		const off = vi.spyOn(sort.events, 'off')
		const name = new TMenuRadioItem({ value: 'name', group: sort })
		const date = new TMenuRadioItem({ value: 'date', group: sort })
		const { plain } = createEngineMenu({ items: [name, date] }).extensions

		expect(on.mock.calls.map(([event]) => event)).toEqual(['change:value'])

		plain.remove(name)

		expect(off).not.toHaveBeenCalled()

		plain.remove(date)

		expect(off.mock.calls).toEqual(on.mock.calls)
	})

	it('охранник menuOf отдаёт нажатие переключателя', () => {
		expect(menuOf(createEngineMenu())?.checkItem).toBeTypeOf('function')
	})
})
