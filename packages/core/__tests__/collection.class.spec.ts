import { describe, it, expect, vi } from 'vitest'
import { TCollection, TPlainExtension, TActivationExtension, TSelectionExtension } from '@soldy/core'

type Item = { id: number; name: string }

describe('TCollection', () => {
	it('создаётся без расширений', () => {
		const col = new TCollection<Item>()

		expect(col.extensions).toEqual({})
		expect(col.engine.length).toBe(0)
	})

	it('создаётся с расширениями', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollection<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		expect(col.extensions.plain).toBe(plain)
	})

	it('расширения устанавливаются (install вызывается)', () => {
		const plain = new TPlainExtension<Item>()

		new TCollection<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		// plain должен иметь доступ к engine через _ctx
		expect(plain.length).toBe(0)
	})

	it('расширения могут взаимодействовать через engine', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollection<Item, {
			plain: TPlainExtension<Item>
			activation: TActivationExtension<Item>
		}>({
			extensions: { plain, activation },
		})

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)

		expect(col.engine.length).toBe(1)
		expect(activation.activeItem).toBe(item)
	})

	it('batch: делегирует в engine', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollection<Item, { plain: TPlainExtension<Item> }>({
			extensions: { plain },
		})

		const changeItems = vi.fn()

		col.engine.events.on('change:items', changeItems)

		col.batch(() => {
			plain.insert({ id: 1, name: 'a' })
			plain.insert({ id: 2, name: 'b' })
		})

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('события engine пробрасываются корректно через расширения', () => {
		const plain = new TPlainExtension<Item>()
		const activation = new TActivationExtension<Item>()

		const col = new TCollection<Item, {
			plain: TPlainExtension<Item>
			activation: TActivationExtension<Item>
		}>({
			extensions: { plain, activation },
		})

		const order: string[] = []

		col.engine.events.on('item:added', () => order.push('engine:added'))
		col.engine.events.on('change:count', () => order.push('engine:count'))
		col.engine.events.on('change:items', () => order.push('engine:items'))
		activation.events.on('change:activation', () => order.push('activation:change'))

		const item: Item = { id: 1, name: 'a' }

		plain.insert(item)
		activation.activate(item)

		expect(order).toEqual([
			'engine:added',
			'engine:count',
			'engine:items',
			'activation:change',
		])
	})

	it('можно использовать с кастомным storage', () => {
		const plain = new TPlainExtension<Item>()

		const col = new TCollection<Item, { plain: TPlainExtension<Item> }>({
			storage: undefined, // дефолтный TArrayStorage
			extensions: { plain },
		})

		expect(col.engine.length).toBe(0)
	})
})
