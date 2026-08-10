import { describe, it, expect } from 'vitest'
import { TArrayStorage } from '@soldy/core'

describe('TArrayStorage', () => {
	it('изначально пуст', () => {
		const storage = new TArrayStorage<{ id: number }>()

		expect(storage.items).toEqual([])
	})

	it('insert: добавляет элемент по индексу', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.insert(2, 1)
		storage.insert(0, 0) // в начало

		expect(storage.items).toEqual([0, 1, 2])
	})

	it('remove: удаляет элемент по ссылке', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.insert(2, 1)
		storage.insert(3, 2)

		storage.remove(2)

		expect(storage.items).toEqual([1, 3])
	})

	it('remove: ничего не делает если элемент не найден', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.remove(99)

		expect(storage.items).toEqual([1])
	})

	it('move: перемещает элемент с from на to', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.insert(2, 1)
		storage.insert(3, 2)

		storage.move(0, 2)

		expect(storage.items).toEqual([2, 3, 1])
	})

	it('move: ничего не делает при одинаковых индексах', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.insert(2, 1)

		storage.move(0, 0)

		expect(storage.items).toEqual([1, 2])
	})

	it('move: ничего не делает при выходе за границы', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.move(-1, 0)
		storage.move(0, 99)

		expect(storage.items).toEqual([1])
	})

	it('clear: удаляет все элементы', () => {
		const storage = new TArrayStorage<number>()

		storage.insert(1, 0)
		storage.insert(2, 1)
		storage.clear()

		expect(storage.items).toEqual([])
	})
})
