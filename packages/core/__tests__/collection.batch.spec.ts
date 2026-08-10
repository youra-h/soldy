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
	it('add: добавляет несколько элементов пакетно', () => {
		const col = createCollection()
		const items: Item[] = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		]

		col.extensions.batch.add(items)

		expect(col.engine.length).toBe(2)
		// insert по умолчанию в index 0 → порядок обратный
		expect([...col.engine]).toEqual([items[1], items[0]])
	})

	it('add: эмитит items:added с массивом элементов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.batch.events.on('items:added', handler)

		const items: Item[] = [{ id: 1, name: 'a' }]

		col.extensions.batch.add(items)

		expect(handler).toHaveBeenCalledWith(items)
	})

	it('add: engine-события эмитятся пакетно (одно change:items)', () => {
		const col = createCollection()
		const changeItems = vi.fn()
		const added = vi.fn()

		col.engine.events.on('change:items', changeItems)
		col.engine.events.on('item:added', added)

		col.extensions.batch.add([
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

		col.extensions.batch.add([a, b, c])
		col.extensions.batch.remove([a, c])

		expect([...col.engine]).toEqual([b])
	})

	it('remove: эмитит items:removed с массивом элементов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.batch.events.on('items:removed', handler)

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.batch.add([a, b])
		col.extensions.batch.remove([a, b])

		expect(handler).toHaveBeenCalledWith([a, b])
	})

	it('clear: удаляет все элементы', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.batch.add([a, b])
		col.extensions.batch.clear()

		expect(col.engine.length).toBe(0)
	})
})
