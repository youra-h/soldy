import { describe, it, expect, vi } from 'vitest'
import {
	TMenu,
	TMenuCheckboxItem,
	TMenuCollectionFacade,
	TMenuGroup,
	TMenuItem,
	TMenuSeparator,
	TMenuSubmenu,
	createEngineMenu,
	createEngineSelection,
	isMenuSubmenu,
	menuOf,
} from '@soldy-ui/core'
import type { IMenuItem, TGroupSection } from '@soldy-ui/core'

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

	it('пункт с подменю, снятый из коллекции, меню больше не трогает', () => {
		const { root, share, send, engine } = tree()
		const chosen = vi.fn()

		engine.extensions.menu.events.on('choose', chosen)
		engine.extensions.plain.remove(share)

		share.open = true
		send.open = true
		share.notifyChoose(new TMenuItem({ value: 'x' }))

		expect(chosen).not.toHaveBeenCalled()
		expect(root.open).toBe(true)
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
