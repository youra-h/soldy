import { describe, it, expect, vi } from 'vitest'
import {
	TMenu,
	TMenuCheckboxItem,
	TMenuCollectionFacade,
	TMenuGroup,
	TMenuItem,
	TMenuSeparator,
	createEngineMenu,
	createEngineSelection,
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
