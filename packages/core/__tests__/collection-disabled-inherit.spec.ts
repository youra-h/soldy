/**
 * `disabled` владельца коллекции распространяется на элементы, как у
 * `<fieldset>`: выключенный владелец выключает их, включённый — включает.
 * Пишет его расширение коллекции в обычный `item.disabled`: при добавлении —
 * только если владелец выключен, иначе собственное «выключено» элемента из
 * `items` пропадало бы сразу; на смену у владельца — всем; на `batch.patch` —
 * поверх данных.
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
import type { TDataset } from '@soldy-ui/core'

/** Источник элемента — то, что приходит в `items`. */
type TSource = { value: string; disabled?: boolean }

/** То, что сценарий трогает у элемента: у всех коллекций оно общее. */
type TItemProbe = {
	disabled: boolean
	readonly dataset: TDataset
	readonly events: {
		on(event: 'change:disabled', handler: (value: boolean) => void): void
	}
}

/** Собранная коллекция вместе с владельцем. */
type THarness = {
	readonly owner: { disabled: boolean }
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
	build(options: { disabled: boolean; items: TSource[] }): THarness
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

const cases: TCase[] = [
	{
		name: 'ListBox',
		build: ({ disabled, items }) => {
			const owner = new TListBox({ disabled })
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
		build: ({ disabled, items }) => {
			const owner = new TTabs({ disabled })
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
		build: ({ disabled, items }) => {
			const owner = new TAccordion({ disabled })
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
		build: ({ disabled, items }) => {
			const owner = new TTags({ disabled })
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
		build: ({ disabled, items }) => {
			const owner = new TRadioGroup({ disabled })
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
		build: ({ disabled, items }) => {
			const owner = new TSelect({ disabled })
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

describe.each(cases)('$name · disabled владельца распространяется на элементы', ({ build }) => {
	it('свой disabled из items сохраняется, пока владелец включён', () => {
		const { item } = build({
			disabled: false,
			items: [{ value: 'a', disabled: true }, { value: 'b' }],
		})

		expect(item('a').disabled).toBe(true)
		expect(item('a').dataset.get('disabled')).toBe('true')
		expect(item('b').disabled).toBe(false)
		expect(item('b').dataset.get('disabled')).toBe('false')
	})

	it('выключенный владелец выключает всех, включённый — включает всех', () => {
		const { owner, item } = build({
			disabled: false,
			items: [{ value: 'a', disabled: true }, { value: 'b' }],
		})

		owner.disabled = true

		expect(item('a').disabled).toBe(true)
		expect(item('b').disabled).toBe(true)
		expect(item('b').dataset.get('disabled')).toBe('true')

		owner.disabled = false

		expect(item('a').disabled).toBe(false)
		expect(item('b').disabled).toBe(false)
		expect(item('b').dataset.get('disabled')).toBe('false')
	})

	it('собранные и вставленные в выключенного владельца выключены', () => {
		const { owner, item, push } = build({ disabled: true, items: [{ value: 'a' }] })
		const pushed = push({ value: 'b' })

		expect(item('a').disabled).toBe(true)
		expect(item('a').dataset.get('disabled')).toBe('true')
		expect(pushed.disabled).toBe(true)
		expect(pushed.dataset.get('disabled')).toBe('true')

		owner.disabled = false

		expect(item('a').disabled).toBe(false)
		expect(pushed.disabled).toBe(false)
		expect(pushed.dataset.get('disabled')).toBe('false')
	})

	it('batch.patch не включает элемент выключенного владельца', () => {
		const { item, patch } = build({ disabled: true, items: [{ value: 'a' }] })
		const a = item('a')

		patch([{ value: 'a', disabled: false }])

		// Патч обновил тот же элемент, а не заменил его
		expect(item('a')).toBe(a)
		expect(a.disabled).toBe(true)
	})

	it('change:disabled — только тем, у кого значение сменилось', () => {
		const { owner, item } = build({
			disabled: false,
			items: [{ value: 'a', disabled: true }, { value: 'b' }],
		})
		const own = vi.fn()
		const inherited = vi.fn()

		item('a').events.on('change:disabled', own)
		item('b').events.on('change:disabled', inherited)

		owner.disabled = true

		expect(own).not.toHaveBeenCalled()
		expect(inherited).toHaveBeenCalledOnce()
		expect(inherited).toHaveBeenLastCalledWith(true)

		owner.disabled = false

		expect(own).toHaveBeenCalledOnce()
		expect(inherited).toHaveBeenCalledTimes(2)
		expect(inherited).toHaveBeenLastCalledWith(false)
	})
})
