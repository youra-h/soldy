import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TBatchExtension, TPlainExtension, TQueryCommand } from '@soldy/core'

type Item = { id: number; name: string }

function createCollection() {
	return new TCollectionEngine<
		Item,
		{ batch: TBatchExtension<Item>; plain: TPlainExtension<Item> }
	>({
		extensions: { batch: new TBatchExtension<Item>(), plain: new TPlainExtension<Item>() },
	})
}

const items = (): Item[] => [
	{ id: 1, name: 'alpha' },
	{ id: 2, name: 'beta' },
	{ id: 3, name: 'gamma' },
]

/** Подписчик, сужающий выборку — стенд-ин будущего расширения `filter`. */
function useFilter(col: ReturnType<typeof createCollection>, predicate: (item: Item) => boolean) {
	col.getCore().driver.events.on('items:query:before', (e) => {
		e.items = e.items.filter(predicate)
	})
}

describe('driver.query', () => {
	it('без подписчиков возвращает сырой состав storage', () => {
		const col = createCollection()

		col.extensions.batch.set(items())

		const result = col.getCore().driver.query(new TQueryCommand<Item>())

		expect([...result]).toEqual(items())
	})

	it('эмитит items:query:before со снимком состава', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.batch.set(items())
		col.getCore().driver.events.on('items:query:before', handler)
		col.getCore().driver.query(new TQueryCommand<Item>())

		expect(handler).toHaveBeenCalledTimes(1)
		expect([...handler.mock.calls[0][0].items]).toEqual(items())
	})

	it('подписчик может сузить выборку — storage при этом полон', () => {
		const col = createCollection()

		col.extensions.batch.set(items())
		useFilter(col, (item) => item.name.includes('a') && item.id !== 2)

		const result = col.getCore().driver.query(new TQueryCommand<Item>())

		expect(result.map((i) => i.id)).toEqual([1, 3])
		expect(col.getCore().driver.valueOf().length).toBe(3)
	})

	it('подписчик может подменить элементы обёртками', () => {
		const col = createCollection()

		col.extensions.batch.set(items())
		col.getCore().driver.events.on('items:query:before', (e) => {
			e.items = e.items.map(
				(item) =>
					new Proxy(item, {
						get: (t, p, r) => (p === 'name' ? 'pre ' + t.name : Reflect.get(t, p, r)),
					}),
			)
		})

		const result = col.getCore().driver.query(new TQueryCommand<Item>())

		expect(result[0].name).toBe('pre alpha')
		// в хранилище лежит исходное значение
		expect(col.getCore().driver.valueOf()[0].name).toBe('alpha')
	})

	it('не эмитит change:items — чтение не является изменением состава', () => {
		const col = createCollection()

		col.extensions.batch.set(items())

		const changeItems = vi.fn()

		col.getCore().driver.events.on('change:items', changeItems)
		col.getCore().driver.query(new TQueryCommand<Item>())
		col.getCore().driver.query(new TQueryCommand<Item>())

		expect(changeItems).not.toHaveBeenCalled()
	})

	it('отдаёт снимок: последующая мутация storage результат не меняет', () => {
		const col = createCollection()

		col.extensions.batch.set(items())

		const result = col.getCore().driver.query(new TQueryCommand<Item>())

		col.extensions.plain.insert({ id: 4, name: 'delta' })

		expect(result.length).toBe(3)
		expect(col.getCore().driver.valueOf().length).toBe(4)
	})

	it('preventDefault отдаёт пустую выборку', () => {
		const col = createCollection()

		col.extensions.batch.set(items())
		col.getCore().driver.events.on('items:query:before', (e) => e.preventDefault())

		expect(col.getCore().driver.query(new TQueryCommand<Item>())).toEqual([])
	})
})

describe('batch.items и batch.shown — разные вопросы', () => {
	it('без подписчиков совпадает с составом', () => {
		const col = createCollection()

		col.extensions.batch.set(items())

		expect([...col.extensions.batch.items]).toEqual(items())
	})

	it('shown сужается подписчиком, items остаются полными', () => {
		const col = createCollection()

		col.extensions.batch.set(items())
		useFilter(col, (item) => item.id === 2)

		expect(col.extensions.batch.shown.map((i) => i.id)).toEqual([2])
		expect(col.extensions.batch.items.map((i) => i.id)).toEqual([1, 2, 3])
		expect(col.extensions.batch.length).toBe(3)
	})
})

describe('batch.find — согласован с items', () => {
	it('находит элемент в полном составе', () => {
		const col = createCollection()

		col.extensions.batch.set(items())

		expect(col.extensions.batch.find((i) => i.id === 2)).toEqual({ id: 2, name: 'beta' })
		expect(col.extensions.batch.find((i) => i.id === 99)).toBeUndefined()
	})

	it('find ищет в хранилище, shown.find — среди показанных', () => {
		const col = createCollection()

		col.extensions.batch.set(items())
		useFilter(col, (item) => item.id === 2)

		// существует, просто не показан
		expect(col.extensions.batch.find((i) => i.id === 1)).toBeDefined()
		expect(col.extensions.batch.shown.find((i) => i.id === 1)).toBeUndefined()
	})
})
