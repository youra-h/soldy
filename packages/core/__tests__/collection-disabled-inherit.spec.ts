/**
 * «Выключено» элемента коллекции: своё **или** владельца.
 *
 * Список, собранный данными (`items` сразу при создании), терял собственное
 * `disabled` элемента: владельческое расширение при добавлении писало элементу
 * значение списка. В разметке состояние выживало случайно — его возвращал
 * биндинг уже после регистрации в списке. Теперь правило одно
 * (`bindDisabledToOwner`): своё значение лежит в `rawValue`, итог отдаёт
 * резольвер, и расширения `item.disabled` не пишут.
 *
 * Своё и итог — два свойства, как `input.disabled` и `:disabled` под
 * `<fieldset disabled>`: `disabled` отдаёт своё, `resolvedDisabled` — итог.
 * Пока геттер `disabled` отдавал итог, своё `true` из разметки в выключенном
 * списке совпадало с ним, обмен считал его повтором и не записывал — и после
 * включения списка элемент оживал.
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
	readonly resolvedDisabled: boolean
	readonly dataset: TDataset
	readonly events: {
		on(
			event: 'change:disabled' | 'change:disabled:resolved',
			handler: (value: boolean) => void,
		): void
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

describe.each(cases)('$name · disabled элемента: своё или владельца', ({ build }) => {
	/** Воспроизведение из задачи. */
	it('свой disabled из items сохраняется, сосед включён', () => {
		const { item } = build({
			disabled: false,
			items: [{ value: 'a', disabled: true }, { value: 'b' }],
		})

		expect(item('a').disabled).toBe(true)
		expect(item('a').resolvedDisabled).toBe(true)
		expect(item('a').dataset.get('disabled')).toBe('true')
		expect(item('b').disabled).toBe(false)
		expect(item('b').resolvedDisabled).toBe(false)
		expect(item('b').dataset.get('disabled')).toBe('false')
	})

	it('владелец выключает всех, а включение возвращает каждому своё', () => {
		const { owner, item } = build({
			disabled: false,
			items: [{ value: 'a', disabled: true }, { value: 'b' }],
		})

		owner.disabled = true

		expect(item('a').resolvedDisabled).toBe(true)
		expect(item('b').resolvedDisabled).toBe(true)
		expect(item('b').dataset.get('disabled')).toBe('true')
		// Своё владелец не трогает: у выключенного вместе со списком оно `false`
		expect(item('a').disabled).toBe(true)
		expect(item('b').disabled).toBe(false)

		owner.disabled = false

		expect(item('a').resolvedDisabled).toBe(true)
		expect(item('a').dataset.get('disabled')).toBe('true')
		expect(item('b').resolvedDisabled).toBe(false)
		expect(item('b').dataset.get('disabled')).toBe('false')
	})

	it('собранные и вставленные в выключенного владельца выключены, пока выключен он', () => {
		const { owner, item, push } = build({ disabled: true, items: [{ value: 'a' }] })
		const pushed = push({ value: 'b' })

		expect(item('a').resolvedDisabled).toBe(true)
		expect(item('a').dataset.get('disabled')).toBe('true')
		expect(pushed.resolvedDisabled).toBe(true)
		expect(pushed.dataset.get('disabled')).toBe('true')
		expect(pushed.disabled).toBe(false)

		owner.disabled = false

		expect(item('a').resolvedDisabled).toBe(false)
		expect(pushed.resolvedDisabled).toBe(false)
		expect(pushed.dataset.get('disabled')).toBe('false')
	})

	/**
	 * Итог уже `true`, но своё значение обязано записаться и читаться: обмен
	 * сверяет вход с геттером `disabled`, и геттер, отдающий итог, спрятал бы
	 * запись из разметки — своё пропало бы при включении владельца.
	 */
	it('своё disabled = true при выключенном владельце переживает его включение', () => {
		const { owner, item } = build({ disabled: true, items: [{ value: 'a' }, { value: 'b' }] })

		item('a').disabled = true

		expect(item('a').disabled).toBe(true)

		owner.disabled = false

		expect(item('a').disabled).toBe(true)
		expect(item('a').resolvedDisabled).toBe(true)
		expect(item('a').dataset.get('disabled')).toBe('true')
		expect(item('b').resolvedDisabled).toBe(false)
	})

	it('то же, когда своё приходит через batch.patch', () => {
		const { owner, item, patch } = build({
			disabled: true,
			items: [{ value: 'a' }, { value: 'b' }],
		})
		const a = item('a')

		patch([{ value: 'a', disabled: true }, { value: 'b' }])
		owner.disabled = false

		// Патч обновил тот же элемент, а не заменил его
		expect(item('a')).toBe(a)
		expect(a.disabled).toBe(true)
		expect(a.resolvedDisabled).toBe(true)
		expect(item('b').resolvedDisabled).toBe(false)
	})

	it('своё true в выключенном списке: один change:disabled, итог молчит', () => {
		const { owner, item } = build({ disabled: true, items: [{ value: 'a' }] })
		const own = vi.fn()
		const resolved = vi.fn()

		item('a').events.on('change:disabled', own)
		item('a').events.on('change:disabled:resolved', resolved)

		item('a').disabled = true
		// То же значение — повтор, события нет
		item('a').disabled = true

		expect(own).toHaveBeenCalledOnce()
		expect(own).toHaveBeenLastCalledWith(true)
		expect(resolved).not.toHaveBeenCalled()

		// Включили список — итог остался `true`: своё его держит
		owner.disabled = false

		expect(item('a').resolvedDisabled).toBe(true)
		expect(resolved).not.toHaveBeenCalled()
		expect(own).toHaveBeenCalledOnce()
	})

	it('change:disabled:resolved — одно на смену итога, у выключенного самим собой — ни одного', () => {
		const { owner, item } = build({
			disabled: false,
			items: [{ value: 'a', disabled: true }, { value: 'b' }],
		})
		const own = vi.fn()
		const inherited = vi.fn()
		const ownValue = vi.fn()

		item('a').events.on('change:disabled:resolved', own)
		item('b').events.on('change:disabled:resolved', inherited)
		item('b').events.on('change:disabled', ownValue)

		owner.disabled = true

		expect(inherited).toHaveBeenCalledOnce()
		expect(inherited).toHaveBeenLastCalledWith(true)
		// Владелец своё значение элемента не меняет — и о нём не сообщает
		expect(ownValue).not.toHaveBeenCalled()

		// Своё `true` при выключенном владельце итога не меняет — события итога нет
		item('b').disabled = true
		item('b').disabled = false

		expect(inherited).toHaveBeenCalledOnce()
		expect(ownValue).toHaveBeenCalledTimes(2)

		owner.disabled = false

		expect(inherited).toHaveBeenCalledTimes(2)
		expect(inherited).toHaveBeenLastCalledWith(false)
		expect(own).not.toHaveBeenCalled()
	})
})
