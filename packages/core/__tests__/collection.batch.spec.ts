import { describe, it, expect, vi } from 'vitest'
import { TCollection, TBatchExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const batch = new TBatchExtension<Item>()

	return new TCollection<Item, { batch: TBatchExtension<Item> }>({
		extensions: { batch },
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

		expect(col.engine.length).toBe(2)
		// порядок сохраняется (как в items)
		expect([...col.engine]).toEqual(items)
	})

	it('set: эмитит items:added с массивом элементов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.batch.events.on('items:added', handler)

		const items: Item[] = [{ id: 1, name: 'a' }]

		col.extensions.batch.set(items)

		expect(handler).toHaveBeenCalledWith(items)
	})

	it('set: engine-события эмитятся пакетно (одно change:items)', () => {
		const col = createCollection()
		const changeItems = vi.fn()
		const added = vi.fn()

		col.engine.events.on('change:items', changeItems)
		col.engine.events.on('item:added', added)

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

		expect([...col.engine]).toEqual([b])
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

		expect(col.engine.length).toBe(0)
	})

	// --- patch ---

	it('patch: добавляет новые элементы в пустую коллекцию', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		col.extensions.batch.patch([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])

		expect(col.engine.length).toBe(2)
	})

	it('patch: обновляет существующий элемент на месте по trackBy', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		const a: Item = { id: 1, name: 'a' }

		col.extensions.batch.set([a])
		col.extensions.batch.patch([{ id: 1, name: 'a-updated' }])

		expect(col.engine.length).toBe(1)
		expect(col.engine[0]).toBe(a)
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

		expect(col.engine.length).toBe(1)
		expect(col.engine[0].id).toBe(2)
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
			{ id: 3, name: 'c' },         // add
		])

		const byId = new Map([...col.engine].map((i) => [i.id, i.name]))

		expect([...col.engine].map((i) => i.id).sort()).toEqual([1, 3])
		expect(byId.get(1)).toBe('a-updated')
		expect(byId.get(3)).toBe('c')
		expect(byId.has(2)).toBe(false)
	})

	it('patch: engine-события эмитятся пакетно (одно change:items)', () => {
		const col = createCollection()
		col.extensions.batch.trackBy = (item) => item.id

		const changeItems = vi.fn()

		col.engine.events.on('change:items', changeItems)

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
