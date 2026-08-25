import { describe, it, expect, vi } from 'vitest'
import {
	TArrayStorage,
	TInsertCommand,
	TRemoveCommand,
	TUpdateCommand,
	TMoveCommand,
	TClearCommand,
	TEvented,
} from '@soldy/core'
import type { TEngineEvents, ICommandContext } from '@soldy/core'

type Item = { id: number; name: string }

function createEvents() {
	return new TEvented<TEngineEvents<Item>>()
}

function createContext(
	storage: TArrayStorage<Item>,
	events = createEvents(),
): ICommandContext<Item> {
	return { storage, events }
}

describe('TInsertCommand', () => {
	it('apply: вставляет элемент по индексу', () => {
		const storage = new TArrayStorage<Item>()
		const item: Item = { id: 1, name: 'a' }

		new TInsertCommand(item, 0).apply(createContext(storage))

		expect(storage.items).toEqual([item])
	})

	it('emitEvents: эмитит item:added и change:count', () => {
		const storage = new TArrayStorage<Item>()
		const events = createEvents()
		const added = vi.fn()
		const count = vi.fn()

		events.on('item:added', added)
		events.on('change:count', count)

		const item: Item = { id: 1, name: 'a' }

		storage.insert(item, 0)
		new TInsertCommand(item, 0).emitEvents(createContext(storage, events))

		expect(added).toHaveBeenCalledTimes(1)
		expect(added.mock.calls[0][0].item).toBe(item)
		expect(count).toHaveBeenCalledWith(1)
	})
})

describe('TRemoveCommand', () => {
	it('apply: удаляет элемент', () => {
		const storage = new TArrayStorage<Item>()
		const item: Item = { id: 1, name: 'a' }

		storage.insert(item, 0)
		new TRemoveCommand(item).apply(createContext(storage))

		expect(storage.items).toEqual([])
	})

	it('emitEvents: эмитит item:removed и change:count', () => {
		const storage = new TArrayStorage<Item>()
		const events = createEvents()
		const removed = vi.fn()
		const count = vi.fn()

		events.on('item:removed', removed)
		events.on('change:count', count)

		const item: Item = { id: 1, name: 'a' }

		storage.insert(item, 0)
		storage.remove(item)
		new TRemoveCommand(item).emitEvents(createContext(storage, events))

		expect(removed).toHaveBeenCalledWith(item)
		expect(count).toHaveBeenCalledWith(0)
	})
})

describe('TUpdateCommand', () => {
	it('apply: обновляет свойства элемента', () => {
		const storage = new TArrayStorage<Item>()
		const item: Item = { id: 1, name: 'a' }

		storage.insert(item, 0)
		new TUpdateCommand(item, { name: 'b' }).apply(createContext(storage))

		expect(item.name).toBe('b')
	})

	it('emitEvents: эмитит item:updated с TUpdateEvent', () => {
		const storage = new TArrayStorage<Item>()
		const events = createEvents()
		const updated = vi.fn()

		events.on('item:updated', updated)

		const item: Item = { id: 1, name: 'a' }
		const changes = { name: 'b' }

		new TUpdateCommand(item, changes).emitEvents(createContext(storage, events))

		expect(updated).toHaveBeenCalledTimes(1)

		const event = updated.mock.calls[0][0]
		expect(event.item).toBe(item)
		expect(event.changes).toEqual({ name: 'b' })
	})
})

describe('TMoveCommand', () => {
	it('apply: перемещает элемент по старому и новому индексу', () => {
		const storage = new TArrayStorage<Item>()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		storage.insert(a, 0)
		storage.insert(b, 1)

		new TMoveCommand(a, 1, 0).apply(createContext(storage))

		expect(storage.items).toEqual([b, a])
	})

	it('apply: auto-resolve старого индекса если не указан', () => {
		const storage = new TArrayStorage<Item>()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		storage.insert(a, 0)
		storage.insert(b, 1)

		new TMoveCommand(a, 1).apply(createContext(storage))

		expect(storage.items).toEqual([b, a])
	})

	it('emitEvents: эмитит item:moved', () => {
		const storage = new TArrayStorage<Item>()
		const events = createEvents()
		const moved = vi.fn()

		events.on('item:moved', moved)

		const a: Item = { id: 1, name: 'a' }

		storage.insert(a, 0)

		const ctx = createContext(storage, events)
		const cmd = new TMoveCommand(a, 0, 0)

		cmd.apply(ctx)
		cmd.emitEvents(ctx)

		expect(moved).not.toHaveBeenCalled() // oldIndex === newIndex — не эмитится
	})

	it('emitEvents: эмитит item:moved при реальном перемещении', () => {
		const storage = new TArrayStorage<Item>()
		const events = createEvents()
		const moved = vi.fn()

		events.on('item:moved', moved)

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		storage.insert(a, 0)
		storage.insert(b, 1)

		const ctx = createContext(storage, events)
		const cmd = new TMoveCommand(a, 1, 0)

		cmd.apply(ctx)
		cmd.emitEvents(ctx)

		expect(moved).toHaveBeenCalledWith(a, 0, 1)
	})
})

describe('TClearCommand', () => {
	it('apply: очищает хранилище', () => {
		const storage = new TArrayStorage<Item>()
		storage.insert({ id: 1, name: 'a' }, 0)
		storage.insert({ id: 2, name: 'b' }, 1)

		new TClearCommand<Item>().apply(createContext(storage))

		expect(storage.items).toEqual([])
	})

	it('emitEvents: эмитит item:removed для каждого элемента, change:count, reset', () => {
		const storage = new TArrayStorage<Item>()
		const events = createEvents()
		const removed = vi.fn()
		const count = vi.fn()
		const reset = vi.fn()

		events.on('item:removed', removed)
		events.on('change:count', count)
		events.on('reset', reset)

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		storage.insert(a, 0)
		storage.insert(b, 1)

		const ctx = createContext(storage, events)
		const cmd = new TClearCommand<Item>()

		cmd.apply(ctx)
		cmd.emitEvents(ctx)

		expect(removed).toHaveBeenCalledTimes(2)
		expect(count).toHaveBeenCalledWith(0)
		expect(reset).toHaveBeenCalledOnce()
	})
})
