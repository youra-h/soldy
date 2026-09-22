import { describe, it, expect, vi } from 'vitest'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TOrderExtension,
} from '@soldy-ui/core'

type Item = { id: number; name: string }

function createCollection() {
	const plain = new TPlainExtension<Item>()
	const batch = new TBatchExtension<Item>()
	const order = new TOrderExtension<Item>()

	return new TCollectionEngine<
		Item,
		{ plain: TPlainExtension<Item>; batch: TBatchExtension<Item>; order: TOrderExtension<Item> }
	>({
		extensions: { plain, batch, order },
	})
}

describe('TOrderExtension', () => {
	it('getItemOrder: возвращает индекс элемента', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		expect(col.extensions.order.getItemOrder(a)).toBe(1)
		expect(col.extensions.order.getItemOrder(b)).toBe(0)
	})

	it('getItemOrder: возвращает -1 если элемента нет', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		expect(col.extensions.order.getItemOrder(item)).toBe(-1)
	})

	it('эмитит change:order при изменении items', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.order.events.on('change:order', handler)
		col.extensions.plain.insert({ id: 1, name: 'a' })

		expect(handler).toHaveBeenCalledOnce()
	})

	it('эмитит change:order при перемещении', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		col.extensions.order.events.on('change:order', handler)
		col.extensions.plain.move(a, 0)

		expect(handler).toHaveBeenCalledOnce()
	})

	it('эмитит change:order один раз при batch с несколькими перемещениями', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const c: Item = { id: 3, name: 'c' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.plain.insert(c)

		col.extensions.order.events.on('change:order', handler)

		col.batch(() => {
			col.extensions.plain.move(a, 2)
			col.extensions.plain.move(b, 0)
		})

		expect(handler).toHaveBeenCalledOnce()
	})

	it('эмитит change:order при удалении элемента', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)

		col.extensions.order.events.on('change:order', handler)
		col.extensions.plain.remove(a)

		expect(handler).toHaveBeenCalledOnce()
	})

	it('эмитит change:order один раз при очистке нескольких элементов', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		col.extensions.order.events.on('change:order', handler)
		col.extensions.batch.clear()

		expect(handler).toHaveBeenCalledOnce()
	})

	it('не эмитит change:order при перемещении на тот же индекс', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)

		col.extensions.order.events.on('change:order', handler)
		col.extensions.plain.move(a, 0)

		expect(handler).not.toHaveBeenCalled()
	})

	it('не эмитит change:order при batch из нескольких обновлений', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		col.extensions.order.events.on('change:order', handler)

		col.batch(() => {
			col.extensions.plain.update(a, { name: 'a2' })
			col.extensions.plain.update(b, { name: 'b2' })
		})

		expect(handler).not.toHaveBeenCalled()
	})

	it('не эмитит change:order, если после отменённой вставки прошло обновление (флаг не протекает)', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(a)

		col.getCore().driver.events.on('item:add:before', (event) => event.preventDefault())

		col.extensions.order.events.on('change:order', handler)

		col.extensions.plain.insert({ id: 2, name: 'b' })
		col.extensions.plain.update(a, { name: 'a2' })

		expect(handler).not.toHaveBeenCalled()
	})

	it('order обновляется после перемещения', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		expect(col.extensions.order.getItemOrder(a)).toBe(1)

		col.extensions.plain.move(a, 0)

		expect(col.extensions.order.getItemOrder(a)).toBe(0)
	})
})
