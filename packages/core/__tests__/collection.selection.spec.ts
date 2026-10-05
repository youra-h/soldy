import { describe, it, expect, vi } from 'vitest'
import {
	TBatchExtension,
	TCollectionEngine,
	TPlainExtension,
	TSelectionExtension,
} from '@soldy-ui/core'
import type { TSelectEvent, TSelectionMode } from '@soldy-ui/core'

type Item = { id: number; name: string }

function createCollection() {
	const plain = new TPlainExtension<Item>()
	const selection = new TSelectionExtension<Item>()

	return new TCollectionEngine<
		Item,
		{ plain: TPlainExtension<Item>; selection: TSelectionExtension<Item> }
	>({
		extensions: { plain, selection },
	})
}

/** Коллекция с пачкой: наполнение `batch.set` и сверка `patch`. */
function createBatchCollection() {
	const plain = new TPlainExtension<Item>()
	const batch = new TBatchExtension<Item>()
	const selection = new TSelectionExtension<Item>()

	return new TCollectionEngine<
		Item,
		{
			plain: TPlainExtension<Item>
			batch: TBatchExtension<Item>
			selection: TSelectionExtension<Item>
		}
	>({
		extensions: { plain, batch, selection },
	})
}

type TBatchCollection = ReturnType<typeof createBatchCollection>

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

	// Эхо `update:selected` у `v-model` возвращает элементу `true`: выбрать
	// выбранное — не смена, как снять невыбранное
	it.each(['single', 'multiple'] as const)(
		'select: выбранное в %s — без change:selection',
		(mode) => {
			const col = createCollection()
			const item: Item = { id: 1, name: 'a' }
			const changes = vi.fn()

			col.extensions.selection.mode = mode
			col.extensions.plain.insert(item)
			col.extensions.selection.select(item)
			col.extensions.selection.events.on('change:selection', changes)
			col.extensions.selection.select(item)

			expect(changes).not.toHaveBeenCalled()
			expect(col.extensions.selection.selected).toEqual([item])
		},
	)

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

	// --- selectMany / deselectMany ---

	describe('пачкой', () => {
		/** Коллекция в режиме `mode` с тремя элементами и счётчиком `change:selection`. */
		function filled(mode: TSelectionMode = 'multiple') {
			const col = createCollection()
			const { plain, selection } = col.extensions
			const list: Item[] = [
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' },
				{ id: 3, name: 'c' },
			]

			list.forEach((item) => plain.push(item))
			selection.mode = mode

			const changes = vi.fn<(items: Item[]) => void>()

			selection.events.on('change:selection', changes)

			return { selection, list, changes }
		}

		it('selectMany: одно change:selection на пачку, выбор — в порядке пачки', () => {
			const { selection, list, changes } = filled()

			selection.selectMany(list)

			expect(selection.selected).toEqual(list)
			expect(changes.mock.calls).toEqual([[list]])
		})

		it('selectMany: item:select:before на каждый элемент, отмена одного остальных не отменяет', () => {
			const { selection, list, changes } = filled()
			const [a, b, c] = list
			const before = vi.fn((e: TSelectEvent<Item>) => {
				if (e.item === b) e.preventDefault()
			})

			selection.events.on('item:select:before', before)
			selection.selectMany(list)

			expect(before.mock.calls.map(([e]) => e.item)).toEqual([a, b, c])
			expect(selection.selected).toEqual([a, c])
			expect(changes).toHaveBeenCalledOnce()
		})

		it('selectMany: вне коллекции и уже выбранные — без хука; не сменилось ничего — без события', () => {
			const { selection, list, changes } = filled()
			const [a, b] = list
			const stranger: Item = { id: 9, name: 'z' }
			const before = vi.fn()

			selection.select(a)
			changes.mockClear()
			selection.events.on('item:select:before', before)
			selection.selectMany([a, stranger, b])

			expect(before.mock.calls.map(([e]) => e.item)).toEqual([b])
			expect(selection.selected).toEqual([a, b])
			expect(changes).toHaveBeenCalledOnce()

			changes.mockClear()
			selection.selectMany([a, stranger, b])

			expect(changes).not.toHaveBeenCalled()
		})

		it.each(['single', 'none'] as const)(
			'selectMany: в %s пачка не выбирается — ни хука, ни события, прежний выбор на месте',
			(mode) => {
				const { selection, list, changes } = filled(mode)
				const before = vi.fn()

				if (mode === 'single') selection.select(list[2])
				changes.mockClear()
				selection.events.on('item:select:before', before)
				selection.selectMany(list)

				expect(selection.selected).toEqual(mode === 'single' ? [list[2]] : [])
				expect(before).not.toHaveBeenCalled()
				expect(changes).not.toHaveBeenCalled()
			},
		)

		it('deselectMany: одно change:selection на пачку, невыбранные пропускаются', () => {
			const { selection, list, changes } = filled()
			const [a, b, c] = list

			selection.selectMany([a, c])
			changes.mockClear()
			selection.deselectMany(list)

			expect(selection.selected).toEqual([])
			expect(changes.mock.calls).toEqual([[[]]])

			changes.mockClear()
			selection.deselectMany([a, b])

			expect(changes).not.toHaveBeenCalled()
		})

		it('deselectMany: и в single', () => {
			const { selection, list, changes } = filled('single')

			selection.select(list[1])
			changes.mockClear()
			selection.deselectMany(list)

			expect(selection.selected).toEqual([])
			expect(changes).toHaveBeenCalledOnce()
		})

		it('data-selected — один проход по коллекции на пачку, а не по проходу на элемент', () => {
			const col = createCollection()
			const { plain, selection } = col.extensions
			const dataset = { add: vi.fn() }
			const list = Array.from({ length: 50 }, (_, index) => ({
				id: index,
				name: String(index),
				dataset,
			}))

			list.forEach((item) => plain.push(item))
			selection.mode = 'multiple'
			dataset.add.mockClear()

			selection.selectMany(list)

			expect(dataset.add).toHaveBeenCalledTimes(list.length)

			dataset.add.mockClear()
			selection.deselectMany(list)

			expect(dataset.add).toHaveBeenCalledTimes(list.length)
		})
	})

	/**
	 * Удалили выбранный — выбор сменился, и об этом `change:selection`, как
	 * активация объявляет снятие удалённого активного. Раз на запись: запись
	 * удаляет пачкой, а подписчики выбора проходят всю коллекцию.
	 */
	describe('удаление выбранного', () => {
		function filled(mode: TSelectionMode = 'multiple') {
			const col = createBatchCollection()
			const { batch, selection } = col.extensions
			const list: Item[] = [
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' },
				{ id: 3, name: 'c' },
				{ id: 4, name: 'd' },
			]

			batch.set(list)
			selection.mode = mode

			const changes = vi.fn<(items: Item[]) => void>()

			return { col, list, changes }
		}

		it('удалённый выбранный — одно change:selection с оставшимся выбором', () => {
			const { col, list, changes } = filled()
			const { plain, selection } = col.extensions
			const [a, b, c] = list

			selection.selectMany([a, b, c])
			selection.events.on('change:selection', changes)
			plain.remove(b)

			expect(selection.selected).toEqual([a, c])
			expect(changes.mock.calls).toEqual([[[a, c]]])
		})

		it('в single — то же: удалённый выбранный снимает выбор с событием', () => {
			const { col, list, changes } = filled('single')
			const { plain, selection } = col.extensions

			selection.select(list[1])
			selection.events.on('change:selection', changes)
			plain.remove(list[1])

			expect(selection.selected).toEqual([])
			expect(changes.mock.calls).toEqual([[[]]])
		})

		it('удалённый невыбранный выбор не меняет — события нет', () => {
			const { col, list, changes } = filled()
			const { plain, selection } = col.extensions

			selection.selectMany([list[0]])
			selection.events.on('change:selection', changes)
			plain.remove(list[1])

			expect(changes).not.toHaveBeenCalled()
		})

		it('пачка удаляет несколько выбранных — одно change:selection, после всех item:removed', () => {
			const { col, list, changes } = filled()
			const { batch, selection } = col.extensions
			const [a, b, c, d] = list
			const order: string[] = []

			selection.selectMany([a, b, c])
			selection.events.on('change:selection', changes)
			selection.events.on('change:selection', () => order.push('selection'))
			col.getCore().driver.events.on('item:removed', () => order.push('removed'))
			batch.remove([a, b, d])

			expect(selection.selected).toEqual([c])
			expect(changes.mock.calls).toEqual([[[c]]])
			expect(order).toEqual(['removed', 'removed', 'removed', 'selection'])
		})

		it('очистка — одно change:selection с пустым выбором', () => {
			const { col, list, changes } = filled()
			const { batch, selection } = col.extensions

			selection.selectMany(list)
			selection.events.on('change:selection', changes)
			batch.clear()

			expect(selection.selected).toEqual([])
			expect(changes.mock.calls).toEqual([[[]]])
		})

		it('сверка patch убрала выбранные — одно change:selection', () => {
			const { col, list, changes } = filled()
			const { batch, selection } = col.extensions
			const [a, b, c, d] = list

			batch.trackBy = (item) => item.id
			selection.selectMany([a, b, c])
			selection.events.on('change:selection', changes)
			batch.patch([a, d])

			expect(selection.selected).toEqual([a])
			expect(changes.mock.calls).toEqual([[[a]]])
		})
	})

	/**
	 * Замена выбора — одна операция: «то же самое» решает она сама, как сеттер,
	 * и сброс с добором, дававшие событие на каждый шаг, ей не нужны.
	 */
	describe('замена выбора', () => {
		function filled(mode: TSelectionMode = 'multiple') {
			const col = createCollection()
			const { plain, selection } = col.extensions
			const list: Item[] = [
				{ id: 1, name: 'a' },
				{ id: 2, name: 'b' },
				{ id: 3, name: 'c' },
			]

			list.forEach((item) => plain.push(item))
			selection.mode = mode

			const changes = vi.fn<(items: Item[]) => void>()
			const before = vi.fn<(e: TSelectEvent<Item>) => void>()

			return { selection, list, changes, before }
		}

		it('тот же состав тем же порядком — не смена: события и хуков нет', () => {
			const { selection, list, changes, before } = filled()
			const [a, b] = list

			selection.selectMany([a, b])
			selection.events.on('change:selection', changes)
			selection.events.on('item:select:before', before)
			selection.replaceSelection([a, b])

			expect(changes).not.toHaveBeenCalled()
			expect(before).not.toHaveBeenCalled()
		})

		it('другой порядок — смена: одно событие, выбор в порядке замены', () => {
			const { selection, list, changes } = filled()
			const [a, b] = list

			selection.selectMany([a, b])
			selection.events.on('change:selection', changes)
			selection.replaceSelection([b, a])

			expect(selection.selected).toEqual([b, a])
			expect(changes.mock.calls).toEqual([[[b, a]]])
		})

		it('хук — только тому, кто становится выбранным; отмена одного остальных не отменяет', () => {
			const { selection, list, changes, before } = filled()
			const [a, b, c] = list

			selection.selectMany([a])
			before.mockImplementation((e) => {
				if (e.item === b) e.preventDefault()
			})
			selection.events.on('item:select:before', before)
			selection.events.on('change:selection', changes)
			selection.replaceSelection([a, b, c])

			expect(before.mock.calls.map(([e]) => e.item)).toEqual([b, c])
			expect(selection.selected).toEqual([a, c])
			expect(changes).toHaveBeenCalledTimes(1)
		})

		it('выбранный вне списка снимается без хука; элемент вне коллекции пропускается', () => {
			const { selection, list, changes, before } = filled()
			const [a, b] = list
			const stranger: Item = { id: 9, name: 'z' }

			selection.selectMany([a, b])
			selection.events.on('item:select:before', before)
			selection.events.on('change:selection', changes)
			selection.replaceSelection([b, stranger])

			expect(before).not.toHaveBeenCalled()
			expect(selection.selected).toEqual([b])
			expect(changes).toHaveBeenCalledTimes(1)
		})

		it('single: принятый заменяет прежний, итог — последний принятый', () => {
			const { selection, list, changes } = filled('single')
			const [a, b, c] = list

			selection.select(a)
			selection.events.on('change:selection', changes)
			selection.replaceSelection([b, c])

			expect(selection.selected).toEqual([c])
			expect(changes.mock.calls).toEqual([[[c]]])
		})

		it('single: не принят никто — прежний остаётся, пустой список снимает выбор', () => {
			const { selection, list, changes, before } = filled('single')
			const [a, b] = list

			selection.select(a)
			before.mockImplementation((e) => e.preventDefault())
			selection.events.on('item:select:before', before)
			selection.events.on('change:selection', changes)
			selection.replaceSelection([b])

			expect(selection.selected).toEqual([a])
			expect(changes).not.toHaveBeenCalled()

			selection.replaceSelection([])

			expect(selection.selected).toEqual([])
			expect(changes.mock.calls).toEqual([[[]]])
		})

		it('none: выбора нет', () => {
			const { selection, list, changes } = filled('none')

			selection.events.on('change:selection', changes)
			selection.replaceSelection(list)

			expect(selection.selected).toEqual([])
			expect(changes).not.toHaveBeenCalled()
		})
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

	it('mode: переключение с multiple на single снимает выбор целиком', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)
		col.extensions.selection.mode = 'single'

		expect(col.extensions.selection.selectedCount).toBe(0)
	})

	it('mode: сброс при multiple -> single шлёт change:selection один раз с mode уже single', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)

		const handler = vi.fn(() => {
			expect(col.extensions.selection.mode).toBe('single')
		})

		col.extensions.selection.events.on('change:selection', handler)
		col.extensions.selection.mode = 'single'

		expect(handler).toHaveBeenCalledTimes(1)
		expect(handler).toHaveBeenCalledWith([])
	})

	it('mode: переключение с multiple на single не шлёт change:selection, если выбрано 0 элементов', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.selection.mode = 'multiple'
		col.extensions.selection.events.on('change:selection', handler)
		col.extensions.selection.mode = 'single'

		expect(handler).not.toHaveBeenCalled()
	})

	it('mode: переключение с multiple на single при одном выбранном тоже снимает выбор', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.selection.mode = 'multiple'
		col.extensions.plain.insert(item)
		col.extensions.selection.select(item)
		col.extensions.selection.events.on('change:selection', handler)
		col.extensions.selection.mode = 'single'

		expect(col.extensions.selection.selectedCount).toBe(0)
		expect(handler).toHaveBeenCalledWith([])
	})

	it('mode: переключение с single на multiple выбор не трогает', () => {
		const col = createCollection()
		const item: Item = { id: 1, name: 'a' }
		const handler = vi.fn()

		col.extensions.plain.insert(item)
		col.extensions.selection.select(item)
		col.extensions.selection.events.on('change:selection', handler)
		col.extensions.selection.mode = 'multiple'

		expect(col.extensions.selection.selected).toEqual([item])
		expect(handler).not.toHaveBeenCalled()
	})

	it('mode: при сбросе элементы получают data-selected=false', () => {
		const col = createCollection()

		col.extensions.selection.mode = 'multiple'

		const dataset = { add: vi.fn() }
		const a: Item & { dataset: typeof dataset } = { id: 1, name: 'a', dataset }
		const b: Item & { dataset: typeof dataset } = { id: 2, name: 'b', dataset }

		col.extensions.plain.insert(a)
		col.extensions.plain.insert(b)
		col.extensions.selection.select(a)
		col.extensions.selection.select(b)
		dataset.add.mockClear()
		col.extensions.selection.mode = 'single'

		expect(dataset.add).toHaveBeenCalledWith('selected', false)
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

	// --- Наполнение пачкой ---

	// Пачка шлёт `item:added` на каждый элемент разом в конце, когда в
	// хранилище уже все: проход по всем на каждый из них — N² записей
	it('наполнение пачкой: data-selected — одна запись на элемент, у всех с наполнения', () => {
		const col = createBatchCollection()
		const list = Array.from({ length: 50 }, (_, index) => ({
			id: index,
			name: String(index),
			dataset: { add: vi.fn() },
		}))

		col.extensions.batch.set(list)

		for (const item of list) {
			expect(item.dataset.add.mock.calls).toEqual([['selected', false]])
		}
	})

	// --- Авто-очистка при удалении ---

	// Удаление из хранилища — всегда команда с `item:removed`, в пачке и в
	// сверке тоже: отдельной сверки выбора с составом нет
	it.each([
		{
			way: 'remove',
			run: (col: TBatchCollection, item: Item) => col.extensions.plain.remove(item),
		},
		{
			way: 'remove внутри batch',
			run: (col: TBatchCollection, item: Item) =>
				col.batch(() => col.extensions.plain.remove(item)),
		},
		{
			way: 'patch с trackBy',
			run: (col: TBatchCollection, item: Item) => {
				const { batch } = col.extensions

				batch.trackBy = (source) => source.id
				batch.patch(batch.items.filter((stored) => stored !== item))
			},
		},
	])('выбранный, удалённый через $way, уходит из выбора', ({ run }) => {
		const col = createBatchCollection()
		const { plain, selection } = col.extensions
		const a: Item = { id: 1, name: 'a' }
		const b: Item = { id: 2, name: 'b' }

		selection.mode = 'multiple'
		plain.push(a)
		plain.push(b)
		selection.selectMany([a, b])

		run(col, a)

		expect(selection.isSelected(a)).toBe(false)
		expect(selection.selected).toEqual([b])
	})

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
