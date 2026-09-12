import { describe, it, expect, vi } from 'vitest'
import { TCollectionEngine, TBatchExtension, TFilterExtension } from '@soldy/core'

type Row = { id: number; firstName: string; lastName: string; age: number; active: boolean }

function createCollection() {
	return new TCollectionEngine<
		Row,
		{ batch: TBatchExtension<Row>; filter: TFilterExtension<Row> }
	>({
		extensions: { batch: new TBatchExtension<Row>(), filter: new TFilterExtension<Row>() },
	})
}

const rows = (): Row[] => [
	{ id: 1, firstName: 'Иван', lastName: 'Петров', age: 30, active: true },
	{ id: 2, firstName: 'Пётр', lastName: 'Иванов', age: 17, active: false },
	{ id: 3, firstName: 'Мария', lastName: 'Сидорова', age: 45, active: true },
]

const ids = (col: ReturnType<typeof createCollection>) =>
	col.extensions.batch.shown.map((r) => r.id)

describe('TFilterExtension — поиск по полям', () => {
	it('без запроса отдаёт всё', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())

		expect(ids(col)).toEqual([1, 2, 3])
		expect(col.extensions.filter.active).toBe(false)
	})

	it('ищет по всем полям сразу', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())
		col.extensions.filter.query = 'иван'

		// «Иван» в firstName у первого, «Иванов» в lastName у второго
		expect(ids(col)).toEqual([1, 2])
	})

	it('регистр не важен', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())
		col.extensions.filter.query = 'СИДОРОВА'

		expect(ids(col)).toEqual([3])
	})

	it('ищет по числам и булевым значениям', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())

		col.extensions.filter.query = '45'
		expect(ids(col)).toEqual([3])

		col.extensions.filter.query = 'false'
		expect(ids(col)).toEqual([2])
	})

	it('fields сужает поиск до перечисленных полей', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())
		col.extensions.filter.fields = ['lastName']
		col.extensions.filter.query = 'иван'

		// теперь только Иванов, firstName не смотрится
		expect(ids(col)).toEqual([2])
	})

	it('predicate перекрывает поиск по полям', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())
		col.extensions.filter.predicate = (row) => row.age >= 18

		expect(ids(col)).toEqual([1, 3])
		expect(col.extensions.filter.active).toBe(true)
	})

	it('clear возвращает полную выдачу', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())
		col.extensions.filter.query = 'мария'
		expect(ids(col)).toEqual([3])

		col.extensions.filter.clear()
		expect(ids(col)).toEqual([1, 2, 3])
	})

	it('эмитит change:filter на любое изменение условий', () => {
		const col = createCollection()
		const handler = vi.fn()

		col.extensions.filter.events.on('change:filter', handler)

		col.extensions.filter.query = 'а'
		col.extensions.filter.fields = ['firstName']
		col.extensions.filter.predicate = () => true

		expect(handler).toHaveBeenCalledTimes(3)
	})
})

describe('TFilterExtension — элемент-класс с аксессорами', () => {
	class Option {
		constructor(
			private _text: string,
			readonly value: number,
		) {}

		get text(): string {
			return this._text
		}
	}

	it('видит геттеры прототипа, а не только собственные ключи', () => {
		const col = new TCollectionEngine<
			Option,
			{ batch: TBatchExtension<Option>; filter: TFilterExtension<Option> }
		>({
			extensions: {
				batch: new TBatchExtension<Option>(),
				filter: new TFilterExtension<Option>(),
			},
		})

		col.extensions.batch.set([new Option('Первый', 1), new Option('Второй', 2)])

		// Object.keys у Option вернул бы только _text и value — text это аксессор
		expect(Object.keys(new Option('x', 0))).not.toContain('text')

		col.extensions.filter.query = 'второй'

		expect(col.extensions.batch.shown.map((o) => o.value)).toEqual([2])
	})
})

describe('TFilterExtension — хранилище не страдает', () => {
	it('отбор не трогает storage', () => {
		const col = createCollection()

		col.extensions.batch.set(rows())
		col.extensions.filter.query = 'мария'

		expect(ids(col)).toEqual([3])
		expect(col.getCore().driver.valueOf()).toHaveLength(3)
	})

	it('patch при активном отборе не теряет и не дублирует скрытые', () => {
		const col = createCollection()

		col.extensions.batch.trackBy = (row) => row.id
		col.extensions.batch.set(rows())
		col.extensions.filter.query = 'мария'

		col.extensions.batch.patch(rows())

		expect(
			col
				.getCore()
				.driver.valueOf()
				.map((r) => r.id),
		).toEqual([1, 2, 3])
		expect(ids(col)).toEqual([3])
	})
})

describe('change:shown — как экран узнаёт, что показанное изменилось', () => {
	it('приходит при смене условий отбора', () => {
		const col = createCollection()
		const changeShown = vi.fn()

		col.extensions.batch.set(rows())
		col.extensions.batch.events.on('change:shown', changeShown)

		col.extensions.filter.query = 'мария'

		expect(changeShown).toHaveBeenCalledTimes(1)
	})

	it('при смене отбора состав не объявляется изменённым', () => {
		const col = createCollection()
		const changeItems = vi.fn()

		col.extensions.batch.set(rows())
		col.getCore().driver.events.on('change:items', changeItems)

		col.extensions.filter.query = 'мария'
		col.extensions.filter.clear()

		// хранилище не трогали — значит и change:items быть не должно
		expect(changeItems).not.toHaveBeenCalled()
	})

	it('приходит и при изменении самого состава', () => {
		const col = createCollection()
		const changeShown = vi.fn()

		col.extensions.batch.set(rows())
		col.extensions.batch.events.on('change:shown', changeShown)

		col.extensions.batch.set([
			{ id: 4, firstName: 'Анна', lastName: 'Кузнецова', age: 28, active: true },
		])

		expect(changeShown).toHaveBeenCalled()
	})

	it('к моменту уведомления shown уже отражает новые условия', () => {
		const col = createCollection()
		let seen: number[] = []

		col.extensions.batch.set(rows())
		col.extensions.batch.events.on('change:shown', () => {
			seen = col.extensions.batch.shown.map((r) => r.id)
		})

		col.extensions.filter.query = 'мария'

		expect(seen).toEqual([3])
	})
})
