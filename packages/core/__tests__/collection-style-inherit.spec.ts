/**
 * Размер и вид элемента коллекции: их диктует владелец — кроме варианта тега.
 *
 * Список, собранный данными (`items`), терял собственные `size` и `variant`
 * элемента сразу, а объявленный разметкой — на первой же смене у списка:
 * владельческое расширение писало значение владельца не на всех путях. Теперь
 * правило одно и не зависит от способа наполнения: расширение пишет элементу
 * `size` и `variant` владельца при добавлении, на смену у владельца и поверх
 * `batch.patch`.
 *
 * Вариант тега — исключение: в одном наборе теги бывают разного цвета, и
 * `TTagsExtension` вариант тегу не пишет — ни при добавлении, ни на смену у
 * набора, ни поверх патча. Тег без своего варианта тема красит вариантом
 * набора по классу набора, поэтому у него нет ни значения, ни модификатора.
 * Размер тегу по-прежнему диктует набор.
 *
 * Сценарий один на все коллекции: забытая коллекция иначе прошла бы мимо.
 * Каждая сборка — замыкание на своей фабрике, как в `engine-create.spec.ts`:
 * общая сигнатура движков стёрла бы их типы.
 */

import { describe, it, expect, vi } from 'vitest'
import {
	createEngineAccordion,
	createEngineListBox,
	createEngineRadioGroup,
	createEngineSelect,
	createEngineTable,
	createEngineTabs,
	createEngineTags,
	TAccordion,
	TListBox,
	TRadioGroup,
	TSelect,
	TTable,
	TTabs,
	TTags,
} from '@soldy-ui/core'
import type {
	ITableRow,
	TClasses,
	TComponentSize,
	TComponentVariant,
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
 * Tags: размер тегу диктует набор, а вариант у тега свой — у него свой
 * сценарий (в конце файла), в общий он не входит.
 */
const tags: TCase = {
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
}

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
 * Tags: размер тегу диктует набор, а вариант у тега свой — в одном наборе
 * теги бывают разного цвета. Вариант набора тегу не пишется вовсе, ни поверх
 * своего, ни «если своего нет»: тег без своего тема красит вариантом набора по
 * классу набора (`s-tags--variant-<v>`).
 */
describe('Tags · размер тега диктует набор, вариант — свой', () => {
	const { build } = tags

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
})
