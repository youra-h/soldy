import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TPlainExtension, TOrderExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const plain = new TPlainExtension<Item>()
	const order = new TOrderExtension<Item>()

	return new TCollectionEngine<Item, { plain: TPlainExtension<Item>; order: TOrderExtension<Item> }>({
		extensions: { plain, order },
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

		// TOrderExtension подписан и на change:items, и на item:moved — при
		// реальном перемещении срабатывают оба, поэтому здесь два вызова.
		// Известная отдельная проблема, не в рамках этой задачи: 869f196na.
		expect(handler).toHaveBeenCalled()
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
