import { describe, it, expect, vi } from 'vitest'
import { TCollection, TPlainExtension, TSelectionExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const plain = new TPlainExtension<Item>()
	const selection = new TSelectionExtension<Item>()

	return new TCollection<Item, { plain: TPlainExtension<Item>; selection: TSelectionExtension<Item> }>({
		extensions: { plain, selection },
	})
}

describe('TSelectionExtension', () => {
	it('изначально selectedCount === 0', () => {
		const col = createCollection()

		expect(col.extensions.selection.selectedCount).toBe(0)
		expect(col.extensions.selection.selected).toEqual([])
	})

	it('режим по умолчанию — single', () => {
		const col = createCollection()

		expect(col.extensions.selection.mode).toBe('single')
		expect(col.extensions.selection.single).toBe(true)
		expect(col.extensions.selection.multiple).toBe(false)
	})

	// --- select ---

	it('select: выбирает элемент (single)', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.selection.select(item)

		expect(col.extensions.selection.isSelected(item)).toBe(true)
		expect(col.extensions.selection.selectedCount).toBe(1)
	})

	it('select: в single снимает выделение с предыдущего', () => {
		const col = createCollection()
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)

		expect(col.extensions.selection.isSelected(a)).toBe(false)
		expect(col.extensions.selection.isSelected(b)).toBe(true)
		expect(col.extensions.selection.selectedCount).toBe(1)
	})

	it('select: в multiple не снимает выделение', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)

		expect(col.extensions.selection.isSelected(a)).toBe(true)
		expect(col.extensions.selection.isSelected(b)).toBe(true)
		expect(col.extensions.selection.selectedCount).toBe(2)
	})

	it('select: игнорирует в режиме none', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'none'

		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.selection.select(item)

		expect(col.extensions.selection.selectedCount).toBe(0)
	})

	it('select: игнорирует элемент не из коллекции', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.selection.select(item)

		expect(col.extensions.selection.selectedCount).toBe(0)
	})

	// --- deselect ---

	it('deselect: снимает выделение', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.selection.select(item)
		col.extensions.selection.deselect(item)

		expect(col.extensions.selection.isSelected(item)).toBe(false)
	})

	// --- toggle ---

	it('toggle: переключает выделение', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)

		col.extensions.selection.toggle(item)

		expect(col.extensions.selection.isSelected(item)).toBe(true)

		col.extensions.selection.toggle(item)

		expect(col.extensions.selection.isSelected(item)).toBe(false)
	})

	// --- resetSelection ---

	it('resetSelection: очищает всё выделение', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)
		col.extensions.selection.resetSelection()

		expect(col.extensions.selection.selectedCount).toBe(0)
	})

	// --- mode ---

	it('mode: переключение с multiple на single оставляет один выбранный', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)
		col.extensions.selection.mode = 'single'

		expect(col.extensions.selection.selectedCount).toBe(1)
	})

	it('mode: переключение на none очищает выбор', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }

		col.extensions.plain.insert(item)
		col.extensions.selection.select(item)
		col.extensions.selection.mode = 'none'

		expect(col.extensions.selection.selectedCount).toBe(0)
	})

	// --- События ---

	it('эмитит change:selection при выборе', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.selection.events.on('change:selection', handler)
		col.extensions.selection.select(item)

		expect(handler).toHaveBeenCalledWith([item])
	})

	it('эмитит change:mode при смене режима', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.selection.events.on('change:mode', handler)
		col.extensions.selection.mode = 'multiple'

		expect(handler).toHaveBeenCalledWith('multiple')
	})

	it('не эмитит change:mode при том же значении', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.selection.events.on('change:mode', handler)
		col.extensions.selection.mode = 'single' // уже single

		expect(handler).not.toHaveBeenCalled()
	})

	// --- Авто-очистка при удалении ---

	it('снимает выделение при удалении элемента', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)
		col.extensions.plain.remove(a)

		expect(col.extensions.selection.isSelected(a)).toBe(false)
		expect(col.extensions.selection.isSelected(b)).toBe(true)
		expect(col.extensions.selection.selectedCount).toBe(1)
	})
})
