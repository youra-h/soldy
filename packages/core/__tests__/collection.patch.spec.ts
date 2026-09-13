import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TBatchExtension, TPlainExtension } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	const col = new TCollectionEngine<
		Item,
		{ batch: TBatchExtension<Item>; plain: TPlainExtension<Item> }
	>({
		extensions: { batch: new TBatchExtension<Item>(), plain: new TPlainExtension<Item>() },
	})

	col.extensions.batch.trackBy = (item) => item.id

	return col
}

const seed = (): Item[] => [
	{ id: 1, name: 'alpha' },
	{ id: 2, name: 'beta' },
	{ id: 3, name: 'gamma' },
]

/** Сужает выборку до одного элемента — стенд-ин расширения `filter`. */
function hideAllButId(col: ReturnType<typeof createCollection>, id: number) {
	col.getCore().driver.events.on('items:query:before', (e) => {
		e.items = e.items.filter((item) => item.id === id)
	})
}

describe('TPatchCommand — базовое поведение', () => {
	it('обновляет совпавшие, добавляет новые, удаляет пропавшие', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		col.extensions.batch.patch([
			{ id: 2, name: 'beta-2' },
			{ id: 4, name: 'delta' },
		])

		expect([...col.extensions.batch.items]).toEqual([
			{ id: 2, name: 'beta-2' },
			{ id: 4, name: 'delta' },
		])
	})

	it('обновляет элемент на месте, не пересоздавая его', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const before = col.getCore().driver.valueOf()[1]

		col.extensions.batch.patch([{ id: 2, name: 'beta-2' }])

		expect(col.getCore().driver.valueOf()[0]).toBe(before)
		expect(before.name).toBe('beta-2')
	})

	it('шлёт один change:items на всю сверку', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const changeItems = vi.fn()

		col.getCore().driver.events.on('change:items', changeItems)
		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 4, name: 'delta' },
		])

		expect(changeItems).toHaveBeenCalledTimes(1)
	})

	it('вложенные уведомления доходят по каждому элементу', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())

		const updated = vi.fn()
		const added = vi.fn()
		const removed = vi.fn()

		col.getCore().driver.events.on('item:updated', updated)
		col.getCore().driver.events.on('item:added', added)
		col.getCore().driver.events.on('item:removed', removed)

		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 4, name: 'delta' },
		])

		expect(updated).toHaveBeenCalledTimes(1)
		expect(added).toHaveBeenCalledTimes(1)
		expect(removed).toHaveBeenCalledTimes(2)
	})

	it('без trackBy бросает ошибку', () => {
		const col = createCollection()

		col.extensions.batch.trackBy = undefined
		col.extensions.batch.set(seed())

		expect(() => col.extensions.batch.patch([{ id: 1, name: 'x' }])).toThrow(
			'trackBy function is not set',
		)
	})
})

describe('TPatchCommand при активной выборке — сверка идёт по storage', () => {
	it('полный набор при сужённой выборке ничего не теряет и не дублирует', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		hideAllButId(col, 2)

		// снаружи прилетает тот же набор, что уже лежит в хранилище
		col.extensions.batch.patch(seed())

		// в storage по-прежнему три элемента: ни удалений, ни дублей
		expect(col.getCore().driver.valueOf().length).toBe(3)
		expect(
			col
				.getCore()
				.driver.valueOf()
				.map((i) => i.id),
		).toEqual([1, 2, 3])
		// а видно наружу по-прежнему только один
		expect(col.extensions.batch.shown.map((i) => i.id)).toEqual([2])
	})

	it('скрытые элементы обновляются, а не вставляются заново', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		hideAllButId(col, 2)

		const hidden = col.getCore().driver.valueOf()[0]

		col.extensions.batch.patch([
			{ id: 1, name: 'alpha-2' },
			{ id: 2, name: 'beta' },
			{ id: 3, name: 'gamma' },
		])

		expect(col.getCore().driver.valueOf().length).toBe(3)
		expect(col.getCore().driver.valueOf()[0]).toBe(hidden)
		expect(hidden.name).toBe('alpha-2')
	})

	it('новый элемент добавляется, даже когда выборка его не покажет', () => {
		const col = createCollection()

		col.extensions.batch.set(seed())
		hideAllButId(col, 2)

		col.extensions.batch.patch([...seed(), { id: 4, name: 'delta' }])

		expect(col.getCore().driver.valueOf().length).toBe(4)
		expect(col.extensions.batch.shown.map((i) => i.id)).toEqual([2])
	})
})
