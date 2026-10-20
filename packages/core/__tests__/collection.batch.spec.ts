import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TSelectionExtension,
	TBatchCollectionFacade,
} from '@soldy-ui/core'
import type { IBatchCollectionProps } from '@soldy-ui/core'

type Item = { id: number; name: string }
type Extensions = { plain: TPlainExtension<Item>; batch: TBatchExtension<Item> }

function createCollection() {
	const plain = new TPlainExtension<Item>()
	const batch = new TBatchExtension<Item>()

	return new TCollectionEngine<Item, Extensions>({
		extensions: { plain, batch },
	})
}

describe('TBatchExtension', () => {
	it('set: добавляет несколько элементов пакетно', () => {
		const col = createCollection()
		const items: Item[] = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		]

		col.extensions.batch.set(items)

		expect(col.extensions.batch.items.length).toBe(2)
		// порядок сохраняется (как в items)
		expect([...col.extensions.batch.items]).toEqual(items)
	})

	it('set: эмитит items:added с массивом элементов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.batch.events.on('items:added', handler)

		const items: Item[] = [{ id: 1, name: 'a' }]

		col.extensions.batch.set(items)

		expect(handler).toHaveBeenCalledWith(items)
	})

	it('set: driver-события эмитятся пакетно (одно change:items)', () => {
		const col = createCollection()
		const changeItems = vi.fn()
		const added = vi.fn()

		col.extensions.plain.events.on('change:items', changeItems)
		col.extensions.plain.events.on('item:added', added)

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])

		expect(added).toHaveBeenCalledTimes(2)
		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('remove: удаляет несколько элементов пакетно', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const c: Item = { id: 3, name: 'c' }

		col.extensions.batch.set([a, b, c])
		col.extensions.batch.remove([a, c])

		expect([...col.extensions.batch.items]).toEqual([b])
	})

	it('remove: эмитит items:removed с массивом элементов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.batch.events.on('items:removed', handler)

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.batch.set([a, b])
		col.extensions.batch.remove([a, b])

		expect(handler).toHaveBeenCalledWith([a, b])
	})

	it('clear: удаляет все элементы', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.batch.set([a, b])
		col.extensions.batch.clear()

		expect(col.extensions.batch.items.length).toBe(0)
	})

	// --- patch ---

	it('patch: добавляет новые элементы в пустую коллекцию', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.patch([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])

		expect(col.extensions.batch.items.length).toBe(2)
	})

	it('patch: обновляет существующий элемент на месте по trackBy', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		const a: Item = { id: 1, name: 'a' }

		col.extensions.batch.set([a])
		col.extensions.batch.patch([{ id: 1, name: 'a-updated' }])

		expect(col.extensions.batch.items.length).toBe(1)
		expect(col.extensions.batch.items[0]).toBe(a)
		expect(a.name).toBe('a-updated')
	})

	it('patch: удаляет элементы, которых нет в новом массиве', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
			{ id: 3, name: 'c' },
		])

		col.extensions.batch.patch([{ id: 2, name: 'b' }])

		expect(col.extensions.batch.items.length).toBe(1)
		expect(col.extensions.batch.items[0].id).toBe(2)
	})

	it('patch: комбинированно добавляет, обновляет и удаляет', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.set([
			{ id: 1, name: 'a' }, // будет обновлён
			{ id: 2, name: 'b' }, // будет удалён
		])

		col.extensions.batch.patch([
			{ id: 1, name: 'a-updated' }, // update
			{ id: 3, name: 'c' }, // add
		])

		const byId = new Map([...col.extensions.batch.items].map((i) => [i.id, i.name]))

		expect([...col.extensions.batch.items].map((i) => i.id).sort()).toEqual([1, 3])
		expect(byId.get(1)).toBe('a-updated')
		expect(byId.get(3)).toBe('c')
		expect(byId.has(2)).toBe(false)
	})

	it('patch: driver-события эмитятся пакетно (одно change:items)', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		const changeItems = vi.fn()

		col.extensions.plain.events.on('change:items', changeItems)

		col.extensions.batch.set([{ id: 1, name: 'a' }])
		changeItems.mockClear()

		col.extensions.batch.patch([
			{ id: 1, name: 'a-updated' },
			{ id: 2, name: 'b' },
		])

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('patch: бросает ошибку, если trackBy вернул undefined', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = () => undefined

		col.extensions.batch.set([{ id: 1, name: 'a' }])

		expect(() => col.extensions.batch.patch([{ id: 1, name: 'a' }])).toThrow()
	})
})

/**
 * Пустой вход с `trackBy` — тоже состав: сверка удаляет всё, чего в нём нет.
 * Раньше `patch` обрывал его проверкой на пустоту, и `items = []` оставлял
 * коллекцию и выбор как были — а без `trackBy` тот же `items = []` очищал.
 */
describe('TBatchExtension — пустой items с trackBy', () => {
	function createSelectable() {
		const col = new TCollectionEngine<
			Item,
			{
				plain: TPlainExtension<Item>
				batch: TBatchExtension<Item>
				selection: TSelectionExtension<Item>
			}
		>({
			extensions: {
				plain: new TPlainExtension<Item>(),
				batch: new TBatchExtension<Item>(),
				selection: new TSelectionExtension<Item>(),
			},
		})

		col.extensions.batch.trackBy = (item) => item.id

		return col
	}

	it('очищает коллекцию и снимает выбор одним change:items', () => {
		const col = createSelectable()

		col.extensions.batch.items = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		]
		col.extensions.selection.select(col.extensions.batch.items[1])

		expect(col.extensions.selection.selected).toHaveLength(1)

		const changeItems = vi.fn()
		const added = vi.fn()

		col.extensions.plain.events.on('change:items', changeItems)
		col.extensions.batch.events.on('items:added', added)

		col.extensions.batch.items = []

		expect(col.extensions.batch.items).toEqual([])
		expect(changeItems).toHaveBeenCalledTimes(1)
		expect(col.extensions.selection.selected).toEqual([])
		// Добавлять было нечего
		expect(added).not.toHaveBeenCalled()
	})

	it('на пустой коллекции не шлёт ни change:items, ни items:added', () => {
		const col = createSelectable()
		const changeItems = vi.fn()
		const added = vi.fn()

		col.extensions.plain.events.on('change:items', changeItems)
		col.extensions.batch.events.on('items:added', added)

		col.extensions.batch.items = []

		expect(col.extensions.batch.items).toEqual([])
		expect(changeItems).not.toHaveBeenCalled()
		expect(added).not.toHaveBeenCalled()
	})
})

/**
 * Сеттер `items` сверяет состав со своим: те же экземпляры тем же порядком —
 * не смена. Эхо `update:items` у `v-model` возвращает ровно их, и без сверки
 * замена без `trackBy` (`clear()` + `set()`) пересобрала бы коллекцию и
 * сбросила выбор. Операция `update` не сверяет: ею `TFactoryExtension`
 * перевставляет сырые объекты тем же составом.
 */
describe('TBatchExtension — items тем же составом', () => {
	function createSelectable() {
		return new TCollectionEngine<
			Item,
			{
				plain: TPlainExtension<Item>
				batch: TBatchExtension<Item>
				selection: TSelectionExtension<Item>
			}
		>({
			extensions: {
				plain: new TPlainExtension<Item>(),
				batch: new TBatchExtension<Item>(),
				selection: new TSelectionExtension<Item>(),
			},
		})
	}

	it('те же экземпляры новым массивом — без change:items, выбор цел', () => {
		const col = createSelectable()

		col.extensions.batch.items = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		]

		const [first] = col.extensions.batch.items
		const changeItems = vi.fn()

		if (!first) throw new Error('состав пуст')

		col.extensions.selection.select(first)
		col.extensions.plain.events.on('change:items', changeItems)
		col.extensions.batch.items = [...col.extensions.batch.items]

		expect(changeItems).not.toHaveBeenCalled()
		expect(col.extensions.selection.selected).toEqual([first])
	})

	it('другой порядок — смена', () => {
		const col = createSelectable()

		col.extensions.batch.items = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		]

		const changeItems = vi.fn()

		col.extensions.plain.events.on('change:items', changeItems)
		col.extensions.batch.items = [...col.extensions.batch.items].reverse()

		expect(changeItems).toHaveBeenCalled()
		expect(col.extensions.batch.items.map((item) => item.id)).toEqual([2, 1])
	})
})

/**
 * Состав на входе — массив только для чтения: сеттер, операции и команда
 * сверки его только проходят. Поэтому данные, объявленные константой
 * (`as const`, `ReadonlyArray`), уходят коллекции без копии.
 *
 * Вход здесь заморожен: запись в него бросила бы `TypeError`. Тип
 * замороженного — `readonly T[]`, и те же вызовы держат входные типы: их
 * проверяют «Типы — Core».
 */
describe('TBatchExtension — вход только для чтения', () => {
	class TestBatchFacade extends TBatchCollectionFacade<Item, Extensions> {}

	const frozen = (...items: Item[]): readonly Item[] => Object.freeze(items)

	const ids = (items: ReadonlyArray<Item>): number[] => items.map((item) => item.id)

	it('сеттер фасада принимает замороженный состав', () => {
		const facade = new TestBatchFacade({}, { engine: createCollection() })
		const items = frozen({ id: 1, name: 'a' }, { id: 2, name: 'b' })

		facade.items = items

		expect(facade.items).toEqual(items)

		// Замена без `trackBy` — `clear()` + `set()`
		facade.items = frozen({ id: 3, name: 'c' })

		expect(ids(facade.items)).toEqual([3])
	})

	it('сеттер фасада с trackBy сверяет замороженный состав по ключу', () => {
		const facade = new TestBatchFacade({}, { engine: createCollection() })
		const a: Item = { id: 1, name: 'a' }

		facade.trackBy = (item) => item.id
		facade.items = frozen(a, { id: 2, name: 'b' })
		facade.items = frozen({ id: 1, name: 'a-updated' }, { id: 3, name: 'c' })

		expect(ids(facade.items)).toEqual([1, 3])
		// Совпавший по ключу — тот же элемент, обновлённый на месте
		expect(facade.items[0]).toBe(a)
		expect(a.name).toBe('a-updated')
	})

	it('update без trackBy заменяет состав замороженным', () => {
		const col = createCollection()

		col.extensions.batch.set(frozen({ id: 1, name: 'a' }))
		col.extensions.batch.update(frozen({ id: 2, name: 'b' }, { id: 3, name: 'c' }))

		expect(ids(col.extensions.batch.items)).toEqual([2, 3])
	})

	it('update с trackBy сверяет замороженный состав: обновляет, добавляет, удаляет', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }

		col.extensions.batch.trackBy = (item) => item.id
		col.extensions.batch.set(frozen(a, { id: 2, name: 'b' }))
		col.extensions.batch.update(frozen({ id: 1, name: 'a-updated' }, { id: 3, name: 'c' }))

		expect(ids(col.extensions.batch.items)).toEqual([1, 3])
		expect(col.extensions.batch.items[0]).toBe(a)
		expect(a.name).toBe('a-updated')
	})

	it('remove удаляет по замороженному списку', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const c: Item = { id: 3, name: 'c' }

		col.extensions.batch.set(frozen(a, b, c))
		col.extensions.batch.remove(frozen(a, c))

		expect(col.extensions.batch.items).toEqual([b])
	})

	it('items:added и items:removed отдают тот же массив, что дали операции', () => {
		const col = createCollection()
		const added = vi.fn()
		const removed = vi.fn()
		const a: Item = { id: 1, name: 'a' }
		const items = frozen(a)
		const gone = frozen(a)

		col.extensions.batch.events.on('items:added', added)
		col.extensions.batch.events.on('items:removed', removed)

		col.extensions.batch.set(items)
		col.extensions.batch.remove(gone)

		expect(added).toHaveBeenCalledTimes(1)
		expect(added.mock.calls[0][0]).toBe(items)
		expect(removed).toHaveBeenCalledTimes(1)
		expect(removed.mock.calls[0][0]).toBe(gone)
	})

	it('пропсы коллекции принимают состав, объявленный константой', () => {
		const ITEMS = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		] as const
		const props: IBatchCollectionProps<Item, Item> = { items: ITEMS }
		const facade = new TestBatchFacade({}, { engine: createCollection() })

		facade.items = props.items ?? []

		expect(facade.items).toEqual(ITEMS)
	})
})
