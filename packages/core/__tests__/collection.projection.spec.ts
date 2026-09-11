/**
 * Слой проекции driver'а — общий middleware над сырым составом.
 *
 * `driver.projectors` — реестр функций, которые получают текущий состав и
 * возвращают следующий; `driver.projection` — результат цепочки, кэшируемый
 * между инвалидациями. Всё, что читает состав напрямую (`length`, `[0]`,
 * `find`, `forEach`, `valueOf()`, payload `change:items`), остаётся сырым —
 * проекция это отдельный канал, а не подмена поведения driver'а.
 */

import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TBatchExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const batch = new TBatchExtension<Item>()

	return new TCollectionEngine<Item, { batch: TBatchExtension<Item> }>({
		extensions: { batch },
	})
}

describe('пустой реестр проекторов', () => {
	it('projection совпадает с valueOf()', () => {
		const col = createCollection()

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])

		expect([...col.driver.projection]).toEqual(col.driver.valueOf())
	})
})

describe('один проектор-фильтр', () => {
	it('сужает projection, сырые методы driver остаются полными', () => {
		const col = createCollection()
		const items = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		]

		col.extensions.batch.set(items)
		col.driver.projectors.use((list) => list.filter((item) => item.id === 1))

		expect(col.driver.projection).toEqual([items[0]])

		// Сырое чтение — не тронуто проекцией
		expect(col.driver.length).toBe(2)
		expect(col.driver[0]).toBe(items[0])
		expect(col.driver[1]).toBe(items[1])
		expect([...col.driver]).toEqual(items)
		expect(col.driver.valueOf()).toEqual(items)

		const seen: Item[] = []

		col.driver.forEach((item) => seen.push(item))
		expect(seen).toEqual(items)
	})

	it('payload change:items остаётся сырым', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.driver.projectors.use((list) => list.filter((item) => item.id === 1))
		col.driver.events.on('change:items', handler)

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler.mock.calls[0][0]).toHaveLength(2)
	})
})

describe('инвалидация', () => {
	it('change:items инвалидирует кэш проекции', () => {
		const col = createCollection()
		const projector = vi.fn((list: readonly Item[]) => list.filter(() => true))

		col.extensions.batch.trackBy = (item) => item.id
		col.extensions.batch.set([{ id: 1, name: 'a' }])
		col.driver.projectors.use(projector)

		void col.driver.projection // первое чтение — считает
		projector.mockClear()

		col.extensions.batch.patch([{ id: 2, name: 'b' }])

		void col.driver.projection // после change:items кэш должен быть сброшен

		expect(projector).toHaveBeenCalledTimes(1)
	})

	it('invalidate() эмитит change:projection без аргументов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.driver.events.on('change:projection', handler)
		col.driver.projectors.invalidate()

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith()
	})

	it('отписка из use() возвращает исходную проекцию и эмитит событие', () => {
		const col = createCollection()

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])

		const handler = vi.fn()

		col.driver.events.on('change:projection', handler)

		const unuse = col.driver.projectors.use((list) => list.filter((item) => item.id === 1))

		expect(col.driver.projection).toHaveLength(1)
		handler.mockClear()

		unuse()

		expect(handler).toHaveBeenCalledTimes(1)
		expect(col.driver.projection).toHaveLength(2)
	})
})

describe('цепочка проекторов', () => {
	it('применяется по порядку регистрации, второй видит результат первого', () => {
		const col = createCollection()

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
			{ id: 3, name: 'c' },
		])

		const order: string[] = []

		col.driver.projectors.use((list) => {
			order.push('first')

			return list.filter((item) => item.id !== 2)
		})

		col.driver.projectors.use((list) => {
			order.push('second')
			expect(list.map((item) => item.id)).toEqual([1, 3])

			return list.filter((item) => item.id !== 3)
		})

		expect(col.driver.projection.map((item) => item.id)).toEqual([1])
		expect(order).toEqual(['first', 'second'])
	})
})

describe('кэш', () => {
	it('два чтения подряд не вызывают проектор дважды и возвращают ту же ссылку', () => {
		const col = createCollection()

		col.extensions.batch.set([{ id: 1, name: 'a' }])

		const projector = vi.fn((list: readonly Item[]) => list)

		col.driver.projectors.use(projector)
		projector.mockClear()

		const first = col.driver.projection
		const second = col.driver.projection

		expect(projector).toHaveBeenCalledTimes(1)
		expect(first).toBe(second)
	})
})

describe('батч', () => {
	it('внутри batch() — ровно одно change:projection на выходе', () => {
		const col = createCollection()

		col.driver.projectors.use((list) => list)

		const handler = vi.fn()

		col.driver.events.on('change:projection', handler)

		col.extensions.batch.set([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
			{ id: 3, name: 'c' },
		])

		expect(handler).toHaveBeenCalledTimes(1)
	})
})
