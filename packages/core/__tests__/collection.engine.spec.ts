import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TInsertCommand, TArrayStorage } from '@soldy/core'

type Item = { id: number }

describe('TCollectionEngine', () => {
	function createEngine(items: Item[] = []) {
		const storage = new TArrayStorage<Item>()

		items.forEach((item, i) => storage.insert(item, i))

		return new TCollectionEngine<Item>(storage)
	}

	// --- ReadonlyArray ---

	it('доступ по индексу (readonly)', () => {
		const engine = createEngine([{ id: 1 }, { id: 2 }])

		expect(engine[0]).toEqual({ id: 1 })
		expect(engine[1]).toEqual({ id: 2 })
	})

	it('length', () => {
		const engine = createEngine([{ id: 1 }, { id: 2 }])

		expect(engine.length).toBe(2)
	})

	it('итерация (spread)', () => {
		const engine = createEngine([{ id: 1 }, { id: 2 }])

		expect([...engine]).toEqual([{ id: 1 }, { id: 2 }])
	})

	it('forEach', () => {
		const engine = createEngine([{ id: 1 }, { id: 2 }])
		const ids: number[] = []

		engine.forEach((item) => ids.push(item.id))

		expect(ids).toEqual([1, 2])
	})

	it('find', () => {
		const engine = createEngine([{ id: 1 }, { id: 2 }])

		expect(engine.find((item) => item.id === 2)).toEqual({ id: 2 })
	})

	it('filter', () => {
		const engine = createEngine([{ id: 1 }, { id: 2 }, { id: 3 }])

		expect(engine.filter((item) => item.id > 1)).toEqual([{ id: 2 }, { id: 3 }])
	})

	it('includes', () => {
		const item: Item = { id: 1 }
		const engine = createEngine([item])

		expect(engine.includes(item)).toBe(true)
		expect(engine.includes({ id: 2 })).toBe(false)
	})

	it('indexOf', () => {
		const a: Item = { id: 1 }
		const b: Item = { id: 2 }
		const engine = createEngine([a, b])

		expect(engine.indexOf(a)).toBe(0)
		expect(engine.indexOf(b)).toBe(1)
	})

	// --- Мутирующие методы запрещены ---

	it('блокирует push', () => {
		const engine = createEngine()

		expect(() => (engine as any).push({ id: 1 })).toThrow(
			'Array mutation method "push()" is forbidden',
		)
	})

	it('блокирует splice', () => {
		const engine = createEngine([{ id: 1 }])

		expect(() => (engine as any).splice(0, 1)).toThrow(
			'Array mutation method "splice()" is forbidden',
		)
	})

	// --- execute + события ---

	it('execute: выполняет команду и эмитит события', () => {
		const engine = createEngine()
		const added = vi.fn()
		const count = vi.fn()

		engine.events.on('item:added', added)
		engine.events.on('change:count', count)

		const item: Item = { id: 1 }

		engine.execute(new TInsertCommand(item, 0))

		expect(engine.length).toBe(1)
		expect(added).toHaveBeenCalledWith(item)
		expect(count).toHaveBeenCalledWith(1)
	})

	it('execute: эмитит change:items после команды', () => {
		const engine = createEngine()
		const items = vi.fn()

		engine.events.on('change:items', items)

		engine.execute(new TInsertCommand({ id: 1 }, 0))

		expect(items).toHaveBeenCalledWith([{ id: 1 }])
	})

	// --- batch ---

	it('batch: откладывает события до конца пакета', () => {
		const engine = createEngine()
		const added = vi.fn()
		const changeItems = vi.fn()

		engine.events.on('item:added', added)
		engine.events.on('change:items', changeItems)

		engine.batch(() => {
			engine.execute(new TInsertCommand({ id: 1 }, 0))
			engine.execute(new TInsertCommand({ id: 2 }, 1))

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
		const engine = createEngine()
		const changeItems = vi.fn()

		engine.events.on('change:items', changeItems)

		engine.batch(() => {
			engine.execute(new TInsertCommand({ id: 1 }, 0))
			engine.batch(() => {
				engine.execute(new TInsertCommand({ id: 2 }, 1))
			})
		})

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	// --- Порядок событий ---

	it('события эмитятся в правильном порядке', () => {
		const engine = createEngine()
		const order: string[] = []

		engine.events.on('item:added', () => order.push('item:added'))
		engine.events.on('change:count', () => order.push('change:count'))
		engine.events.on('change:items', () => order.push('change:items'))

		engine.execute(new TInsertCommand({ id: 1 }, 0))

		expect(order).toEqual(['item:added', 'change:count', 'change:items'])
	})
})
