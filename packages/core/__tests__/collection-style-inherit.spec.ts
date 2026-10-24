/**
 * Размер и вид элемента коллекции: их диктует владелец — кроме варианта тега и
 * пункта меню.
 *
 * Список, собранный данными (`items`), терял собственные `size` и `variant`
 * элемента сразу, а объявленный разметкой — на первой же смене у списка:
 * владельческое расширение писало значение владельца не на всех путях. Теперь
 * правило одно и не зависит от способа наполнения: расширение пишет элементу
 * `size` и `variant` владельца при добавлении, на смену у владельца и поверх
 * `batch.patch`.
 *
 * Вариант тега и пункта меню — исключение: в одном наборе теги бывают разного
 * цвета, в одном меню бывает «опасный» пункт, и `TTagsExtension` с
 * `TMenuExtension` вариант элементу не пишут — ни при добавлении, ни на смену у
 * владельца, ни поверх патча. Элемент без своего варианта тема красит
 * вариантом владельца по его классу, поэтому у элемента нет ни значения, ни
 * модификатора. Размер элементу по-прежнему диктует владелец. Подменю среди
 * пунктов вариант меню получает отдельным входом своей панели (`menuVariant`),
 * а не своим `variant` — сценарий в конце файла.
 *
 * Вид строк ListBox (`view`) — тем же правилом, что размер и вариант: элементу
 * его пишет список, строке — элемент. Сценарий тоже в конце файла.
 *
 * Сценарий один на все коллекции: забытая коллекция иначе прошла бы мимо.
 * Каждая сборка — замыкание на своей фабрике, как в `engine-create.spec.ts`:
 * общая сигнатура движков стёрла бы их типы.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	createEngineAccordion,
	createEngineListBox,
	createEngineMenu,
	createEngineRadioGroup,
	createEngineSelect,
	createEngineTable,
	createEngineTabs,
	createEngineTags,
	isMenuSubmenu,
	TAccordion,
	TListBox,
	TMenu,
	TRadioGroup,
	TSelect,
	TTable,
	TTabs,
	TTags,
} from '@soldy-ui/core'
import type {
	IMenuItemSource,
	IMenuSubmenu,
	ITableRow,
	TClasses,
	TComponentSize,
	TComponentVariant,
	TListBoxView,
	TTableRecord,
	TValuePayload,
} from '@soldy-ui/core'

/** Источник элемента — то, что приходит в `items`. */
type TSource = { value: string; size?: TComponentSize; variant?: TComponentVariant }

/** То, что сценарий трогает у элемента: у всех коллекций оно общее. */
type TItemProbe = {
	size: TComponentSize
	variant: TComponentVariant | undefined
	readonly classes: TClasses
	readonly events: {
		on(event: 'change:size', handler: (payload: TValuePayload<TComponentSize>) => void): void
		on(
			event: 'change:variant',
			handler: (payload: TValuePayload<TComponentVariant | undefined>) => void,
		): void
	}
}

/** Собранная коллекция вместе с владельцем. */
type THarness = {
	readonly owner: { size: TComponentSize; variant: TComponentVariant | undefined }
	/** Элемент по `value`. */
	item(value: string): TItemProbe
	/** Вставить элемент в конец. */
	push(source: TSource): TItemProbe
	/** Сверить состав по `value` — `batch.patch`, запись в элемент через сеттеры. */
	patch(sources: TSource[]): void
}

type TCase = {
	name: string
	/** Собрать коллекцию данными: `items` передаются сразу при создании. */
	build(options: {
		size?: TComponentSize
		variant?: TComponentVariant
		items: TSource[]
	}): THarness
}

/** Элемент по `value`: без него сценарию дальше проверять нечего. */
function found<TItem extends { readonly value: string | number }>(
	items: ReadonlyArray<TItem>,
	value: string,
): TItem {
	const item = items.find((candidate) => candidate.value === value)

	if (!item) throw new Error(`элемент "${value}" не найден`)

	return item
}

/**
 * У строки таблицы `value` нет: строка — запись приложения. `value` источника
 * становится ключом записи, по нему же строка и находится; остальное — пропсы
 * строки как есть.
 */
const tableRow = ({ value, ...props }: TSource) => ({ ...props, data: { value } })

/** Ключ записи строки. */
const keyOf = (data: TTableRecord | undefined): unknown =>
	data && 'value' in data ? data.value : undefined

/** Строка таблицы по ключу записи. */
function foundRow(rows: ReadonlyArray<ITableRow>, value: string): ITableRow {
	const row = rows.find((candidate) => keyOf(candidate.data) === value)

	if (!row) throw new Error(`строка "${value}" не найдена`)

	return row
}

/**
 * Модификаторы элемента с данным префиксом, без базового класса: по ним видно
 * и что новый класс встал, и что старый снялся.
 */
function modifiers(item: TItemProbe, prefix: string): string[] {
	const { base } = item.classes

	return item.classes
		.toArray()
		.filter((cls) => cls.startsWith(`${base}${prefix}`))
		.map((cls) => cls.slice(base.length))
}

/**
 * Tags и Menu: размер элементу диктует владелец, а вариант у тега и пункта
 * свой — у них свой сценарий (в конце файла), в общий они не входят.
 */
const ownVariant: TCase[] = [
	{
		name: 'Tags',
		build: ({ size, variant, items }) => {
			const owner = new TTags({ size, variant })
			const { batch, plain } = createEngineTags({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
	{
		name: 'Menu',
		build: ({ size, variant, items }) => {
			const owner = new TMenu({ size, variant })
			const { batch, plain } = createEngineMenu({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
]

/** Коллекции, которым владелец диктует и размер, и вид элемента. */
const cases: TCase[] = [
	{
		name: 'ListBox',
		build: ({ size, variant, items }) => {
			const owner = new TListBox({ size, variant })
			const { batch, plain } = createEngineListBox({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
	{
		name: 'Tabs',
		build: ({ size, variant, items }) => {
			const owner = new TTabs({ size, variant })
			const { batch, plain } = createEngineTabs({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
	{
		name: 'Accordion',
		build: ({ size, variant, items }) => {
			const owner = new TAccordion({ size, variant })
			const { batch, plain } = createEngineAccordion({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
	{
		name: 'RadioGroup',
		build: ({ size, variant, items }) => {
			const owner = new TRadioGroup({ size, variant })
			const { batch, plain } = createEngineRadioGroup({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
	{
		name: 'Select',
		build: ({ size, variant, items }) => {
			const owner = new TSelect({ size, variant })
			const { batch, plain } = createEngineSelect({ owner, items }).extensions

			return {
				owner,
				item: (value) => found(batch.items, value),
				push: (source) => plain.push(source),
				patch: (sources) => {
					batch.trackBy = (item) => item.value
					batch.patch(sources)
				},
			}
		},
	},
	{
		name: 'Table',
		build: ({ size, variant, items }) => {
			const owner = new TTable({ size, variant })
			const { batch, plain } = createEngineTable({
				owner,
				items: items.map(tableRow),
			}).extensions

			return {
				owner,
				item: (value) => foundRow(batch.items, value),
				push: (source) => plain.push(tableRow(source)),
				patch: (sources) => {
					batch.trackBy = (row) => keyOf(row.data)
					batch.patch(sources.map(tableRow))
				},
			}
		},
	},
]

describe.each(cases)('$name · размер и вид элемента диктует владелец', ({ build }) => {
	/** Воспроизведение из задачи: наполнение данными. */
	it('свои size и variant из items не действуют', () => {
		const { item } = build({
			size: 'lg',
			variant: 'brand',
			items: [{ value: 'a', size: 'sm', variant: 'danger' }, { value: 'b' }],
		})

		expect(item('a').size).toBe('lg')
		expect(item('a').variant).toBe('brand')
		expect(modifiers(item('a'), '--size-')).toEqual(['--size-lg'])
		expect(modifiers(item('a'), '--variant-')).toEqual(['--variant-brand'])

		expect(item('b').size).toBe('lg')
	})

	it('batch.patch с размером и видом из данных их не меняет', () => {
		const { item, patch } = build({ size: 'lg', variant: 'brand', items: [{ value: 'a' }] })
		const a = item('a')

		patch([{ value: 'a', size: 'sm', variant: 'danger' }])

		// Патч обновил тот же элемент, а не заменил его
		expect(item('a')).toBe(a)
		expect(a.size).toBe('lg')
		expect(a.variant).toBe('brand')
		expect(modifiers(a, '--size-')).toEqual(['--size-lg'])
	})

	it('вставленный элемент получает размер и вид владельца, своих классов не оставляет', () => {
		const { push } = build({ size: 'lg', variant: 'brand', items: [] })
		const pushed = push({ value: 'b', size: 'xl', variant: 'danger' })

		expect(pushed.size).toBe('lg')
		expect(pushed.variant).toBe('brand')
		expect(modifiers(pushed, '--size-')).toEqual(['--size-lg'])
		expect(modifiers(pushed, '--variant-')).toEqual(['--variant-brand'])
	})

	/** Старый класс снимается по настоящему `oldValue`: пару «было/стало» считает элемент. */
	it('смена у владельца доезжает до элемента, старый модификатор снят', () => {
		const { owner, item } = build({
			size: 'lg',
			variant: 'brand',
			items: [{ value: 'a', size: 'sm' }, { value: 'b' }],
		})

		owner.size = '2xl'
		owner.variant = 'danger'

		for (const value of ['a', 'b']) {
			expect(item(value).size).toBe('2xl')
			expect(item(value).variant).toBe('danger')
			expect(modifiers(item(value), '--size-')).toEqual(['--size-2xl'])
			expect(modifiers(item(value), '--variant-')).toEqual(['--variant-danger'])
		}

		// Снятый вид владельца снимает модификатор, а не оставляет старый
		owner.variant = undefined

		expect(item('a').variant).toBeUndefined()
		expect(modifiers(item('a'), '--variant-')).toEqual([])
	})

	it('change:size — одно на смену у владельца', () => {
		const { owner, item } = build({
			size: 'lg',
			items: [{ value: 'a', size: 'sm' }, { value: 'b' }],
		})
		const handler = vi.fn()

		item('a').events.on('change:size', handler)

		owner.size = 'xl'

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenLastCalledWith({ newValue: 'xl', oldValue: 'lg' })

		owner.size = 'normal'

		expect(handler).toHaveBeenCalledTimes(2)
		expect(handler).toHaveBeenLastCalledWith({ newValue: 'normal', oldValue: 'xl' })
	})
})

/**
 * Tags и Menu: размер элементу диктует владелец, а вариант у тега и пункта
 * свой — в одном наборе теги бывают разного цвета, в одном меню бывает
 * «опасный» пункт. Вариант владельца элементу не пишется вовсе, ни поверх
 * своего, ни «если своего нет»: элемент без своего тема красит вариантом
 * владельца по его классу (`so-tags--variant-<v>`, у меню — класс панели
 * `so-menu__panel--variant-<v>`).
 */
describe.each(ownVariant)(
	'$name · размер элемента диктует владелец, вариант — свой',
	({ build }) => {
		it('из items: размер — набора, вариант — свой', () => {
			const { item } = build({
				size: 'lg',
				variant: 'brand',
				items: [{ value: 'a', size: 'sm', variant: 'danger' }, { value: 'b' }],
			})

			expect(item('a').size).toBe('lg')
			expect(modifiers(item('a'), '--size-')).toEqual(['--size-lg'])
			expect(item('a').variant).toBe('danger')
			expect(modifiers(item('a'), '--variant-')).toEqual(['--variant-danger'])

			// Своего нет — ни значения, ни модификатора: вариант набора не его
			expect(item('b').size).toBe('lg')
			expect(item('b').variant).toBeUndefined()
			expect(modifiers(item('b'), '--variant-')).toEqual([])
		})

		it('batch.patch: размер — набора, вариант — из данных', () => {
			const { item, patch } = build({ size: 'lg', variant: 'brand', items: [{ value: 'a' }] })
			const a = item('a')

			patch([{ value: 'a', size: 'sm', variant: 'danger' }])

			// Патч обновил тот же тег, а не заменил его
			expect(item('a')).toBe(a)
			expect(a.size).toBe('lg')
			expect(modifiers(a, '--size-')).toEqual(['--size-lg'])
			expect(a.variant).toBe('danger')
			expect(modifiers(a, '--variant-')).toEqual(['--variant-danger'])
		})

		it('вставленный тег: размер — набора, вариант — свой', () => {
			const { push } = build({ size: 'lg', variant: 'brand', items: [] })
			const pushed = push({ value: 'b', size: 'xl', variant: 'danger' })

			expect(pushed.size).toBe('lg')
			expect(modifiers(pushed, '--size-')).toEqual(['--size-lg'])
			expect(pushed.variant).toBe('danger')
			expect(modifiers(pushed, '--variant-')).toEqual(['--variant-danger'])
		})

		it('смена у набора: размер доезжает, вариант тегов не тронут', () => {
			const { owner, item } = build({
				size: 'lg',
				variant: 'brand',
				items: [{ value: 'a', variant: 'danger' }, { value: 'b' }, { value: 'c' }],
			})
			const handler = vi.fn()

			// Вариант из кода — такой же свой, как из данных
			item('c').variant = 'brand'

			for (const value of ['a', 'b', 'c']) item(value).events.on('change:variant', handler)

			owner.size = '2xl'
			owner.variant = 'danger'
			owner.variant = undefined

			for (const value of ['a', 'b', 'c']) {
				expect(item(value).size).toBe('2xl')
				expect(modifiers(item(value), '--size-')).toEqual(['--size-2xl'])
			}

			expect(item('a').variant).toBe('danger')
			expect(modifiers(item('a'), '--variant-')).toEqual(['--variant-danger'])
			expect(item('b').variant).toBeUndefined()
			expect(modifiers(item('b'), '--variant-')).toEqual([])
			expect(item('c').variant).toBe('brand')
			expect(modifiers(item('c'), '--variant-')).toEqual(['--variant-brand'])
			expect(handler).not.toHaveBeenCalled()
		})

		it('change:size — одно на смену у набора', () => {
			const { owner, item } = build({
				size: 'lg',
				items: [{ value: 'a', size: 'sm' }, { value: 'b' }],
			})
			const handler = vi.fn()

			item('a').events.on('change:size', handler)

			owner.size = 'xl'

			expect(handler).toHaveBeenCalledOnce()
			expect(handler).toHaveBeenLastCalledWith({ newValue: 'xl', oldValue: 'lg' })
		})
	},
)

/**
 * Menu: подменю среди пунктов — пункт, как любой, и вариант меню своим
 * `variant` не получает. Вариант меню ему идёт отдельным входом
 * (`menuVariant`): панель подменю телепортирована, и класс панели меню до её
 * пунктов не доходит, поэтому панель красится сама — своим вариантом подменю,
 * а без него вариантом меню (`panelVariant`). Уровни подменю и смена своего
 * варианта — `menu.spec.ts`, группа «вариант меню».
 */
describe('Menu · подменю: вариант меню — входом панели, а не своим вариантом', () => {
	function build(variant: TComponentVariant | undefined, items: IMenuItemSource[]) {
		const owner = new TMenu({ variant })
		const { batch, plain } = createEngineMenu({ owner, items }).extensions

		batch.trackBy = (item) => item.value

		/** Подменю по `value`: не подменю — сценарию дальше проверять нечего. */
		const submenu = (value: string): IMenuSubmenu => {
			const item = found(batch.items, value)

			if (!isMenuSubmenu(item)) throw new Error(`пункт "${value}" — не подменю`)

			return item
		}

		return {
			owner,
			submenu,
			/** Сверить состав по `value` — `batch.patch`. */
			patch: (sources: IMenuItemSource[]) => batch.patch(sources),
			/** Вставить пункт в конец. */
			push: (source: IMenuItemSource) => plain.push(source),
		}
	}

	/** Модификаторы варианта набора классов, без базового класса. */
	const variants = (classes: TClasses): string[] =>
		classes
			.toArray()
			.filter((cls) => cls.startsWith(`${classes.base}--variant-`))
			.map((cls) => cls.slice(classes.base.length))

	it('из items: свой вариант — свой, вариант меню — во входе панели', () => {
		const { submenu } = build('brand', [
			{ value: 'a', variant: 'danger', items: [] },
			{ value: 'b', items: [] },
		])

		expect(submenu('a').variant).toBe('danger')
		expect(submenu('a').menuVariant).toBe('brand')
		expect(variants(submenu('a').panelClasses)).toEqual(['--variant-danger'])

		// Своего нет — ни значения, ни модификатора у строки; панель — вариантом меню
		expect(submenu('b').variant).toBeUndefined()
		expect(variants(submenu('b').classes)).toEqual([])
		expect(submenu('b').menuVariant).toBe('brand')
		expect(variants(submenu('b').panelClasses)).toEqual(['--variant-brand'])
	})

	it('batch.patch: свой вариант — из данных, вариант меню — во входе панели', () => {
		const { submenu, patch } = build('brand', [{ value: 'a', items: [] }])
		const a = submenu('a')

		patch([{ value: 'a', variant: 'danger', items: [] }])

		// Патч обновил то же подменю, а не заменил его
		expect(submenu('a')).toBe(a)
		expect(a.variant).toBe('danger')
		expect(a.menuVariant).toBe('brand')
		expect(variants(a.panelClasses)).toEqual(['--variant-danger'])

		patch([{ value: 'a', variant: undefined, items: [] }])

		expect(a.variant).toBeUndefined()
		expect(variants(a.panelClasses)).toEqual(['--variant-brand'])
	})

	it('вставленное подменю: свой вариант — свой, вариант меню — во входе панели', () => {
		const { push } = build('brand', [])
		const pushed = push({ value: 'b', variant: 'danger', items: [] })

		if (!isMenuSubmenu(pushed)) throw new Error('вставленный пункт — не подменю')

		expect(pushed.variant).toBe('danger')
		expect(pushed.menuVariant).toBe('brand')
		expect(variants(pushed.panelClasses)).toEqual(['--variant-danger'])
	})

	it('смена у меню: вход панели — за ней, свой вариант не тронут', () => {
		const { owner, submenu } = build('brand', [
			{ value: 'a', variant: 'danger', items: [] },
			{ value: 'b', items: [] },
		])
		const handler = vi.fn()

		for (const value of ['a', 'b']) submenu(value).events.on('change:variant', handler)

		owner.variant = 'danger'

		expect(submenu('a').variant).toBe('danger')
		expect(submenu('b').variant).toBeUndefined()
		expect([submenu('a').menuVariant, submenu('b').menuVariant]).toEqual(['danger', 'danger'])
		expect(variants(submenu('b').panelClasses)).toEqual(['--variant-danger'])

		owner.variant = undefined

		expect(submenu('a').menuVariant).toBeUndefined()
		expect(variants(submenu('a').panelClasses)).toEqual(['--variant-danger'])
		expect(submenu('b').menuVariant).toBeUndefined()
		expect(variants(submenu('b').panelClasses)).toEqual([])
		expect(handler).not.toHaveBeenCalled()
	})
})

/**
 * ListBox: вид строк — тоже владельца. Элементу его пишет то же расширение,
 * что размер и вариант, теми же путями — при добавлении, поверх патча и на
 * смену у списка, — а строке элемента его пишет сам элемент. Своего
 * модификатора у корня элемента нет: вид рисует строка.
 */
describe('ListBox · вид элемента диктует владелец', () => {
	type TViewSource = { value: string; view?: TListBoxView }

	function build(view: TListBoxView | undefined, items: TViewSource[]) {
		const owner = new TListBox({ view })
		const { batch, plain } = createEngineListBox({ owner, items }).extensions

		batch.trackBy = (item) => item.value

		return {
			owner,
			/** Элемент по `value`. */
			item: (value: string) => found(batch.items, value),
			/** Сверить состав по `value` — `batch.patch`. */
			patch: (sources: TViewSource[]) => batch.patch(sources),
			/** Вставить элемент в конец. */
			push: (source: TViewSource) => plain.push(source),
		}
	}

	it('свой view из items не действует — и у строки тоже', () => {
		const { item } = build('solid', [{ value: 'a', view: 'ghost' }, { value: 'b' }])

		expect(item('a').view).toBe('solid')
		expect(item('a').row.view).toBe('solid')
		expect(item('b').view).toBe('solid')
		// Модификатор вида — у строки, а не у корня элемента
		expect(
			item('a')
				.classes.toArray()
				.some((cls) => cls.includes('--view-')),
		).toBe(false)
	})

	it('batch.patch с видом из данных его не меняет', () => {
		const { item, patch } = build('solid', [{ value: 'a' }])
		const a = item('a')

		patch([{ value: 'a', view: 'ghost' }])

		// Патч обновил тот же элемент, а не заменил его
		expect(item('a')).toBe(a)
		expect(a.view).toBe('solid')
		expect(a.row.view).toBe('solid')
	})

	it('вставленный элемент получает вид владельца', () => {
		const { push } = build('solid', [])
		const pushed = push({ value: 'b', view: 'ghost' })

		expect(pushed.view).toBe('solid')
		expect(pushed.row.view).toBe('solid')
	})

	it('смена у владельца доезжает до элемента и строки, change:view — одно на смену', () => {
		const { owner, item } = build('solid', [{ value: 'a', view: 'ghost' }, { value: 'b' }])
		const handler = vi.fn()

		item('a').events.on('change:view', handler)

		owner.view = 'ghost'

		for (const value of ['a', 'b']) {
			expect(item(value).view).toBe('ghost')
			expect(item(value).row.view).toBe('ghost')
		}

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenLastCalledWith('ghost')

		// Снятый вид владельца снимает и вид строки
		owner.view = undefined

		expect(item('a').view).toBeUndefined()
		expect(item('a').row.view).toBeUndefined()
		expect(handler).toHaveBeenCalledTimes(2)
	})
})
