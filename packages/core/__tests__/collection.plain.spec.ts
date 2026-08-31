import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TPlainExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const plain = new TPlainExtension<Item>()

	return new TCollectionEngine<Item, { plain: TPlainExtension<Item> }>({
		extensions: { plain },
	})
}

describe('TPlainExtension', () => {
	it('insert: добавляет элемент и эмитит события driver', () => {
		const col = createCollection()
		const added = vi.fn()

		col.driver.events.on('item:added', added)

		col.extensions.plain.insert({ id: 1, name: 'a' })

		expect(col.driver.length).toBe(1)
		expect(added).toHaveBeenCalledTimes(1)
		expect(added.mock.calls[0][0].item).toEqual({ id: 1, name: 'a' })
	})

	it('insert: по умолчанию в начало', () => {
		const col = createCollection()

		col.extensions.plain.insert({ id: 1, name: 'a' })
		col.extensions.plain.insert({ id: 2, name: 'b' })

		expect([...col.driver]).toEqual([
			{ id: 2, name: 'b' },
			{ id: 1, name: 'a' },
		])
	})

	it('insert: по указанному индексу', () => {
		const col = createCollection()

		col.extensions.plain.insert({ id: 1, name: 'a' }, 0)
		col.extensions.plain.insert({ id: 2, name: 'b' }, 1)

		expect([...col.driver]).toEqual([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])
	})

	it('remove: удаляет элемент и эмитит события', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const removed = vi.fn()

		col.extensions.plain.insert(item)
		col.driver.events.on('item:removed', removed)
		col.extensions.plain.remove(item)

		expect(col.driver.length).toBe(0)
		expect(removed).toHaveBeenCalledWith(item)
	})

	it('update: обновляет элемент и эмитит события', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const updated = vi.fn()

		col.extensions.plain.insert(item)
		col.driver.events.on('item:updated', updated)
		col.extensions.plain.update(item, { name: 'b' })

		expect(item.name).toBe('b')
		expect(updated).toHaveBeenCalledTimes(1)

		const event = updated.mock.calls[0][0]
		expect(event.item).toBe(item)
		expect(event.changes).toEqual({ name: 'b' })
	})

	it('move: перемещает элемент и эмитит события', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a, 0)
		col.extensions.plain.insert(b, 1)

		col.extensions.plain.move(a, 1)

		expect([...col.driver]).toEqual([b, a])
	})

	it('getAll: возвращает все элементы', () => {
		const col = createCollection()

		col.extensions.plain.insert({ id: 1, name: 'a' })
		col.extensions.plain.insert({ id: 2, name: 'b' })

		expect(col.extensions.plain.getAll()).toEqual([
			{ id: 2, name: 'b' },
			{ id: 1, name: 'a' },
		])
	})

	it('find: находит элемент по предикату', () => {
		const col = createCollection()

		col.extensions.plain.insert({ id: 1, name: 'a' })
		col.extensions.plain.insert({ id: 2, name: 'b' })

		expect(col.extensions.plain.find((item) => item.id === 2)).toEqual({ id: 2, name: 'b' })
		expect(col.extensions.plain.find((item) => item.id === 99)).toBeUndefined()
	})

	it('filter: фильтрует элементы', () => {
		const col = createCollection()

		col.extensions.plain.insert({ id: 1, name: 'a' })
		col.extensions.plain.insert({ id: 2, name: 'b' })
		col.extensions.plain.insert({ id: 3, name: 'c' })

		// insert по умолчанию в index 0 → порядок: [c, b, a]
		expect(col.extensions.plain.filter((item) => item.id > 1)).toEqual([
			{ id: 3, name: 'c' },
			{ id: 2, name: 'b' },
		])
	})

	it('get: получает элемент по индексу', () => {
		const col = createCollection()

		col.extensions.plain.insert({ id: 1, name: 'a' })

		expect(col.extensions.plain.get(0)).toEqual({ id: 1, name: 'a' })
		expect(col.extensions.plain.get(99)).toBeUndefined()
	})

	it('length: возвращает количество элементов', () => {
		const col = createCollection()

		expect(col.extensions.plain.length).toBe(0)
		col.extensions.plain.insert({ id: 1, name: 'a' })

		expect(col.extensions.plain.length).toBe(1)
	})
})
