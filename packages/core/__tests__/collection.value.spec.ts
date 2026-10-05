import { describe, it, expect, vi } from 'vitest'
import { TListBox, TListBoxCollectionFacade, TListBoxItem } from '@soldy-ui/core'
import type { IListBoxItem, IListBoxProps, TSelectionMode } from '@soldy-ui/core'

/**
 * Связь `value` владельца и выбора коллекции (`TValueSelectionExtension`) на
 * ListBox: выбор говорит только за элементы, которые есть в коллекции, а
 * значение сводится в выбор одной заменой.
 */
function createListBox(values: string[], mode: TSelectionMode, props: Partial<IListBoxProps> = {}) {
	const owner = new TListBox(props)
	const collection = new TListBoxCollectionFacade({ mode }, { owner })
	const items = values.map((value) => new TListBoxItem({ value, text: value }))

	collection.items = items as IListBoxItem[]

	const { batch, selection } = collection.engine.extensions
	const selectionChanges = vi.fn()
	const valueChanges = vi.fn()

	selection.events.on('change:selection', selectionChanges)
	owner.events.on('change:value', valueChanges)

	return { owner, collection, items, batch, selection, selectionChanges, valueChanges }
}

describe('ключи вне коллекции', () => {
	it('multiple: удалили выбранный — выбор без него, ключ в значении остаётся', () => {
		const { owner, items, batch, selection, selectionChanges, valueChanges } = createListBox(
			['a', 'b', 'c'],
			'multiple',
			{ value: ['a', 'b', 'c'] },
		)
		const [a, b, c] = items

		selectionChanges.mockClear()
		batch.remove([b])

		expect(selection.selected).toEqual([a, c])
		expect(owner.value).toEqual(['a', 'b', 'c'])
		expect(selectionChanges).toHaveBeenCalledTimes(1)
		expect(valueChanges).not.toHaveBeenCalled()
	})

	it('single: удалили выбранный — выбора нет, ключ в значении остаётся', () => {
		const { owner, items, batch, selection, selectionChanges, valueChanges } = createListBox(
			['a', 'b'],
			'single',
			{ value: 'b' },
		)

		selectionChanges.mockClear()
		batch.remove([items[1]])

		expect(selection.selected).toEqual([])
		expect(owner.value).toBe('b')
		expect(selectionChanges).toHaveBeenCalledTimes(1)
		expect(valueChanges).not.toHaveBeenCalled()
	})

	it('вернувшийся элемент снова выбран по ключу', () => {
		const { owner, items, batch, selection } = createListBox(['a', 'b', 'c'], 'multiple', {
			value: ['a', 'b'],
		})
		const [a, b] = items

		batch.remove([b])

		const back = new TListBoxItem({ value: 'b', text: 'b' })

		batch.set([back])

		expect(selection.selected).toEqual([a, back])
		expect(owner.value).toEqual(['a', 'b'])
	})

	it('multiple: выбор другого элемента не стирает ключ, которого нет в коллекции', () => {
		const { owner, items, selection } = createListBox(['a', 'b'], 'multiple', {
			value: ['x', 'a'],
		})

		selection.select(items[1])

		expect(owner.value).toEqual(['x', 'a', 'b'])
	})

	it('multiple: снятый элемент из значения уходит, ключ вне коллекции остаётся', () => {
		const { owner, items, selection } = createListBox(['a', 'b'], 'multiple', {
			value: ['x', 'a'],
		})

		selection.deselect(items[0])

		expect(owner.value).toEqual(['x'])
	})

	it('single: выбор другого элемента занимает значение', () => {
		const { owner, items, selection } = createListBox(['a', 'b'], 'single', { value: 'x' })

		selection.select(items[1])

		expect(owner.value).toBe('b')
	})
})

describe('значение → выбор одной заменой', () => {
	/**
	 * Одна запись — сверка `patch` по `trackBy`. Без ключа замена состава —
	 * две записи, очистка и наполнение, и выбор между ними действительно
	 * пропадает и возвращается.
	 */
	it('запись состава без смены выбора — ни одного change:selection', () => {
		const { collection, items, batch, selectionChanges } = createListBox(
			['a', 'b', 'c'],
			'multiple',
			{ value: ['a', 'c'] },
		)

		batch.trackBy = (item) => item.value
		selectionChanges.mockClear()
		collection.items = [...items, new TListBoxItem({ value: 'd', text: 'd' })] as IListBoxItem[]

		expect(selectionChanges).not.toHaveBeenCalled()
	})

	it('значение в другом порядке — одно change:selection, выбор в порядке значения', () => {
		const { owner, items, selection, selectionChanges } = createListBox(
			['a', 'b', 'c'],
			'multiple',
			{
				value: ['a', 'c'],
			},
		)
		const [a, , c] = items

		selectionChanges.mockClear()
		owner.value = ['c', 'a']

		expect(selection.selected).toEqual([c, a])
		expect(selectionChanges).toHaveBeenCalledTimes(1)
	})

	it('отменённый в item:select:before откатывает значение, ключ вне коллекции остаётся', () => {
		const { owner, items, selection } = createListBox(['a', 'b'], 'multiple', {
			value: ['a'],
		})
		const [a, b] = items

		selection.events.on('item:select:before', (e) => {
			if (e.item === b) e.preventDefault()
		})
		owner.value = ['x', 'a', 'b']

		expect(selection.selected).toEqual([a])
		expect(owner.value).toEqual(['x', 'a'])
	})
})
