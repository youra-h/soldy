import { describe, it, expect, vi } from 'vitest'
import { TCollectionStorageDriver, TInsertCommand, TArrayStorage } from '@soldy/core'

type Item = { id: number }

describe('TCollectionStorageDriver', () => {
	function createEngine(items: Item[] = []) {
		const storage = new TArrayStorage<Item>()

		items.forEach((item, i) => storage.insert(item, i))

		return new TCollectionStorageDriver<Item>(storage)
	}

	// --- ReadonlyArray ---

	it('доступ по индексу (readonly)', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }])

		expect(driver[0]).toEqual({ id: 1 })
		expect(driver[1]).toEqual({ id: 2 })
	})

	it('length', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }])

		expect(driver.length).toBe(2)
	})

	it('итерация (spread)', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }])

		expect([...driver]).toEqual([{ id: 1 }, { id: 2 }])
	})

	it('forEach', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }])
		const ids: number[] = []

		driver.forEach((item) => ids.push(item.id))

		expect(ids).toEqual([1, 2])
	})

	it('find', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }])

		expect(driver.find((item) => item.id === 2)).toEqual({ id: 2 })
	})

	it('filter', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }, { id: 3 }])

		expect(driver.filter((item) => item.id > 1)).toEqual([{ id: 2 }, { id: 3 }])
	})

	it('includes', () => {
		const item: Item = { id: 1 }
		const driver = createEngine([item])

		expect(driver.includes(item)).toBe(true)
		expect(driver.includes({ id: 2 })).toBe(false)
	})

	it('indexOf', () => {
		const a: Item = { id: 1 }
		const b: Item = { id: 2 }
		const driver = createEngine([a, b])

		expect(driver.indexOf(a)).toBe(0)
		expect(driver.indexOf(b)).toBe(1)
	})

	// --- Мутирующие методы запрещены ---

	it('блокирует push', () => {
		const driver = createEngine()

		expect(() => (driver as any).push({ id: 1 })).toThrow(
			'Array mutation method "push()" is forbidden',
		)
	})

	it('блокирует splice', () => {
		const driver = createEngine([{ id: 1 }])

		expect(() => (driver as any).splice(0, 1)).toThrow(
			'Array mutation method "splice()" is forbidden',
		)
	})

	// --- execute + события ---

	it('execute: выполняет команду и эмитит события', () => {
		const driver = createEngine()
		const added = vi.fn()
		const count = vi.fn()

		driver.events.on('item:added', added)
		driver.events.on('change:count', count)

		const item: Item = { id: 1 }

		driver.execute(new TInsertCommand(item, 0))

		expect(driver.length).toBe(1)
		expect(added).toHaveBeenCalledTimes(1)
		expect(added.mock.calls[0][0].item).toBe(item)
		expect(count).toHaveBeenCalledWith(1)
	})

	it('execute: эмитит change:items после команды', () => {
		const driver = createEngine()
		const items = vi.fn()

		driver.events.on('change:items', items)

		driver.execute(new TInsertCommand({ id: 1 }, 0))

		expect(items).toHaveBeenCalledWith([{ id: 1 }])
	})

	// --- batch ---

	it('batch: откладывает события до конца пакета', () => {
		const driver = createEngine()
		const added = vi.fn()
		const changeItems = vi.fn()

		driver.events.on('item:added', added)
		driver.events.on('change:items', changeItems)

		driver.batch(() => {
			driver.execute(new TInsertCommand({ id: 1 }, 0))
			driver.execute(new TInsertCommand({ id: 2 }, 1))

			// Промежуточные события не эмитятся
			expect(added).not.toHaveBeenCalled()
			expect(changeItems).not.toHaveBeenCalled()
		})

		// После batch — одно change:items
		expect(added).toHaveBeenCalledTimes(2)
		expect(changeItems).toHaveBeenCalledTimes(1)
		expect(changeItems).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }])
	})

	it('batch: поддерживает вложенность', () => {
		const driver = createEngine()
		const changeItems = vi.fn()

		driver.events.on('change:items', changeItems)

		driver.batch(() => {
			driver.execute(new TInsertCommand({ id: 1 }, 0))
			driver.batch(() => {
				driver.execute(new TInsertCommand({ id: 2 }, 1))
			})
		})

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	// --- Порядок событий ---

	it('события эмитятся в правильном порядке', () => {
		const driver = createEngine()
		const order: string[] = []

		driver.events.on('item:added', () => order.push('item:added'))
		driver.events.on('change:count', () => order.push('change:count'))
		driver.events.on('change:items', () => order.push('change:items'))

		driver.execute(new TInsertCommand({ id: 1 }, 0))

		expect(order).toEqual(['item:added', 'change:count', 'change:items'])
	})
})
