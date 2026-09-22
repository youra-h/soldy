/**
 * Размер и вид элемента коллекции: их диктует владелец.
 *
 * Список, собранный данными (`items`), терял собственные `size` и `variant`
 * элемента сразу, а объявленный разметкой — на первой же смене у списка:
 * владельческое расширение писало элементу своё значение. Теперь правило одно
 * (`bindStyleToOwner`) и не зависит от способа наполнения: итог отдаёт
 * резольвер владельца, своё значение остаётся в `rawValue` и ни на что не
 * влияет, а расширения `item.size`/`item.variant` не пишут.
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
	createEngineTabs,
	createEngineTags,
	TAccordion,
	TListBox,
	TRadioGroup,
	TSelect,
	TTabs,
	TTags,
} from '@soldy-ui/core'
import type { TClasses, TComponentSize, TComponentVariant, TValuePayload } from '@soldy-ui/core'

/** Источник элемента — то, что приходит в `items`. */
type TSource = { value: string; size?: TComponentSize; variant?: TComponentVariant }

/** То, что сценарий трогает у элемента: у всех коллекций оно общее. */
type TItemProbe = {
	size: TComponentSize
	variant: TComponentVariant | undefined
	readonly classes: TClasses
	/** Своё значение элемента — то, что итог наружу не пропускает. */
	readonly states: {
		readonly size: { readonly rawValue: TComponentSize }
		readonly variant: { readonly rawValue: TComponentVariant | undefined }
	}
	readonly events: {
		on(event: 'change:size', handler: (payload: TValuePayload<TComponentSize>) => void): void
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

		// Своё значение не потеряно — просто ни на что не влияет
		expect(item('a').states.size.rawValue).toBe('sm')
		expect(item('a').states.variant.rawValue).toBe('danger')
		expect(item('b').size).toBe('lg')
	})

	/** Наполнение разметкой: биндинг пишет в инстанс уже после регистрации. */
	it('запись в инстанс итога не меняет', () => {
		const { item } = build({ size: 'lg', variant: 'brand', items: [{ value: 'a' }] })
		const a = item('a')

		a.size = 'sm'
		a.variant = 'danger'

		expect(a.size).toBe('lg')
		expect(a.variant).toBe('brand')
		expect(a.states.size.rawValue).toBe('sm')
		expect(modifiers(a, '--size-')).toEqual(['--size-lg'])
		expect(modifiers(a, '--variant-')).toEqual(['--variant-brand'])
	})

	it('то же, когда своё приходит через batch.patch', () => {
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

	/** Старый класс снимается по настоящему `oldValue` — ради него у `notify` аргумент. */
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

	it('change:size — одно на смену у владельца, своя запись молчит', () => {
		const { owner, item } = build({
			size: 'lg',
			items: [{ value: 'a', size: 'sm' }, { value: 'b' }],
		})
		const handler = vi.fn()

		item('a').events.on('change:size', handler)

		owner.size = 'xl'

		expect(handler).toHaveBeenCalledOnce()
		expect(handler).toHaveBeenLastCalledWith({ newValue: 'xl', oldValue: 'lg' })

		// Своё значение итога не меняет — события нет
		item('a').size = 'sm'
		item('a').size = '2xl'

		expect(handler).toHaveBeenCalledOnce()

		owner.size = 'normal'

		expect(handler).toHaveBeenCalledTimes(2)
		expect(handler).toHaveBeenLastCalledWith({ newValue: 'normal', oldValue: 'xl' })
	})
})
