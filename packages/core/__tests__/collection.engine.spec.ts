import { describe, it, expect, vi } from 'vitest'
import { TCollectionStorageDriver, TInsertCommand, TArrayStorage } from '@soldy/core'

type Item = { id: number }

describe('TCollectionStorageDriver', () => {
	function createEngine(items: Item[] = []) {
		const storage = new TArrayStorage<Item>()

		items.forEach((item, i) => storage.insert(item, i))

		return new TCollectionStorageDriver<Item>(storage)
	}

	// --- снимок состава ---

	it('valueOf: отдаёт состав хранилища', () => {
		const driver = createEngine([{ id: 1 }, { id: 2 }])

		expect(driver.valueOf()).toEqual([{ id: 1 }, { id: 2 }])
	})

	it('valueOf: копия, а не живая ссылка на storage', () => {
		const driver = createEngine([{ id: 1 }])

		const snapshot = driver.valueOf()

		driver.execute(new TInsertCommand({ id: 2 }, 1))

		// снимок, взятый раньше, не догоняет хранилище
		expect(snapshot).toHaveLength(1)
		expect(driver.valueOf()).toHaveLength(2)
	})

	// Драйвер больше не Proxy над массивом: «дай хранилище» и «дай список»
	// должны писаться по-разному, иначе обходить правила слишком легко.
	it('массивом не притворяется: ни чтений, ни мутирующих методов', () => {
		const driver = createEngine([{ id: 1 }]) as any

		expect(driver.length).toBeUndefined()
		expect(driver[0]).toBeUndefined()
		expect(driver.forEach).toBeUndefined()
		expect(driver.find).toBeUndefined()
		expect(driver.push).toBeUndefined()
		expect(driver.splice).toBeUndefined()
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

		expect(driver.valueOf().length).toBe(1)
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
