import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TPlainExtension, TActivationExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const plain = new TPlainExtension<Item>()
	const activation = new TActivationExtension<Item>()

	return new TCollectionEngine<Item, { plain: TPlainExtension<Item>; activation: TActivationExtension<Item> }>({
		extensions: { plain, activation },
	})
}

describe('TActivationExtension', () => {
	it('изначально activeItem === undefined', () => {
		const col = createCollection()

		expect(col.extensions.activation.activeItem).toBeUndefined()
	})

	it('activate: активирует элемент', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)

		expect(col.extensions.activation.activeItem).toBe(item)
	})

	it('activate: игнорирует элемент не из коллекции', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.activation.activate(item)

		expect(col.extensions.activation.activeItem).toBeUndefined()
	})

	it('activate: повторная активация того же элемента — noop', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.activation.events.on('change:activation', handler)
		col.extensions.activation.activate(item)

		expect(handler).toHaveBeenCalledTimes(1)

		col.extensions.activation.activate(item) // повторно

		expect(handler).toHaveBeenCalledTimes(1)
	})

	it('activate: деактивирует предыдущий элемент', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.activation.activate(a)
		col.extensions.activation.activate(b)

		expect(col.extensions.activation.activeItem).toBe(b)
		expect(col.extensions.activation.isActive(a)).toBe(false)
	})

	it('deactivate: деактивирует элемент', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)
		col.extensions.activation.deactivate(item)

		expect(col.extensions.activation.activeItem).toBeUndefined()
	})

	it('deactivate: игнорирует неактивный элемент', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.activation.activate(a)

		const handler = vi.fn()

		col.extensions.activation.events.on('change:activation', handler)
		col.extensions.activation.deactivate(b) // не активен

		expect(handler).not.toHaveBeenCalled()
	})

	it('toggle: переключает активность', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		col.extensions.activation.toggle(item)

		expect(col.extensions.activation.isActive(item)).toBe(true)

		col.extensions.activation.toggle(item)

		expect(col.extensions.activation.isActive(item)).toBe(false)
	})

	it('isActive: возвращает статус', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		expect(col.extensions.activation.isActive(item)).toBe(false)
		col.extensions.activation.activate(item)

		expect(col.extensions.activation.isActive(item)).toBe(true)
	})

	it('reset: сбрасывает активный элемент', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)
		col.extensions.activation.reset()

		expect(col.extensions.activation.activeItem).toBeUndefined()
	})

	// --- События ---

	it('эмитит change:activation при активации', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.activation.events.on('change:activation', handler)
		col.extensions.activation.activate(item)

		expect(handler).toHaveBeenCalledWith(item)
	})

	it('эмитит change:activation с undefined при деактивации', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)
		col.extensions.activation.events.on('change:activation', handler)
		col.extensions.activation.deactivate(item)

		expect(handler).toHaveBeenCalledWith(undefined)
	})

	it('эмитит item:activated и item:deactivated', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const activated = vi.fn()
		const deactivated = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.activation.events.on('item:activated', activated)
		col.extensions.activation.events.on('item:deactivated', deactivated)

		col.extensions.activation.activate(item)

		expect(activated).toHaveBeenCalledWith(item)

		col.extensions.activation.deactivate(item)

		expect(deactivated).toHaveBeenCalledWith(undefined)
	})

	// --- Авто-деактивация при удалении ---

	it('сбрасывает активацию при удалении активного элемента', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)
		col.extensions.activation.events.on('change:activation', handler)
		col.extensions.plain.remove(item)

		expect(col.extensions.activation.activeItem).toBeUndefined()
		expect(handler).toHaveBeenCalledWith(undefined)
	})

	it('сбрасывает активацию при reset driver', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.activation.activate(item)
		col.extensions.activation.events.on('change:activation', handler)

		// Явно эмитим reset на driver
		col.driver.events.emit('reset')

		expect(col.extensions.activation.activeItem).toBeUndefined()
		expect(handler).toHaveBeenCalledWith(undefined)
	})

	// --- findActivatable ---

	it('findActivatable: без предиката возвращает следующий элемент', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		const next = col.extensions.activation.findActivatable(undefined, a)

		expect(next).toBe(b)
	})

	it('findActivatable: с предикатом', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)

		const next = col.extensions.activation.findActivatable((item) => item.id === 2, a)

		expect(next).toBe(b)
	})

	it('findActivatable: возвращает undefined если нет подходящих', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(a)

		expect(col.extensions.activation.findActivatable(undefined, a)).toBeUndefined()
	})
})
