import { describe, it, expect, vi } from 'vitest'
import {
	TFilterExtension,
	TTable,
	TTableCollectionFacade,
	TTableColumn,
	TTableSortExtension,
	createEngine,
	createEngineTable,
} from '@soldy-ui/core'
import type {
	ITableColumn,
	ITableRow,
	TTableCollection,
	TTableColumnSort,
	TTableColumnSource,
	TTableRecord,
	TTableSortDirection,
	TTableSortMode,
} from '@soldy-ui/core'

/**
 * Сортировка строк таблицы — расширение `sort` коллекции строк.
 *
 * Сортировка — выборка, а не перестановка хранилища: порядок данных
 * (`batch.items`) остаётся как есть, упорядочено показанное (`batch.shown`).
 * Состояние — колонки и направления по приоритету — держит расширение; режим
 * «одна или несколько колонок» — стратегия; строки, упорядоченные снаружи
 * (`presorted`), таблица не переставляет. Что строки отсортированы по
 * колонке, расширение пишет в наборы колонки.
 */

const ANNA = { id: 1, name: 'Анна', age: 30 }
const BORIS = { id: 2, name: 'Борис', age: 41 }
const VERA = { id: 3, name: 'Вера', age: 25 }
const GLEB = { id: 4, name: 'Глеб', age: 30 }

const NAME: TTableColumnSource = { field: 'name', text: 'Имя', sortable: true }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', sortable: true }
const ID: TTableColumnSource = { field: 'id', text: '№' }

/** Источник строки — запись приложения. */
const source = (data: TTableRecord) => ({ data })

/** Ключ записи — её `id`. Записи или поля нет — ключа нет. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/** Ключи показанных строк — в показанном порядке. */
const ids = (rows: ReadonlyArray<ITableRow>): unknown[] => rows.map((row) => idOf(row.data))

/** Коллекция строк с записями и колонками; строки сверяются по `id` записи. */
function rows(
	records: readonly TTableRecord[] = [ANNA, BORIS, VERA, GLEB],
	columns: readonly TTableColumnSource[] = [NAME, AGE, ID],
): TTableCollection {
	const engine = createEngineTable({ items: records.map(source) })

	engine.extensions.batch.trackBy = (row) => idOf(row.data)
	engine.extensions.columns.columns = columns

	return engine
}

/** Колонка по полю; нет такой — тест падает здесь. */
function columnOf(engine: TTableCollection, field: string): ITableColumn {
	const found = engine.extensions.columns.columns.find((column) => column.field === field)

	if (!found) throw new Error(`колонки ${field} нет`)

	return found
}

/** Пометки сортировки колонки: направление и приоритет для темы, `aria-sort`. */
function marksOf(column: ITableColumn) {
	return {
		sort: column.dataset.get('sort'),
		priority: column.dataset.get('sort-priority'),
		aria: column.aria.get('aria-sort'),
	}
}

const NO_MARKS = { sort: undefined, priority: undefined, aria: undefined }

/** Счётчики «состояние сменилось» и «показанное устарело» — ставятся до действия. */
function watch(engine: TTableCollection) {
	const sort = vi.fn<(value: TTableColumnSort[]) => void>()
	const shown = vi.fn<() => void>()

	engine.extensions.sort.events.on('change:sort', sort)
	engine.extensions.batch.events.on('change:shown', shown)

	return { sort, shown }
}

/** Коллекция строк над одним полем `v` с сортируемой колонкой по нему. */
function values(list: readonly unknown[]): TTableCollection {
	return rows(
		list.map((v, index) => ({ id: index + 1, v })),
		[{ field: 'v', sortable: true }],
	)
}

/** Значения поля `v` показанных строк — в показанном порядке. */
function shownValues(engine: TTableCollection, direction: TTableSortDirection): unknown[] {
	engine.extensions.sort.sort = [{ field: 'v', direction }]

	return engine.extensions.batch.shown.map((row) =>
		row.data && 'v' in row.data ? row.data.v : 'нет записи',
	)
}

describe('колонка и таблица', () => {
	it('колонка не сортируется, пока потребитель не решил; своего сравнения нет', () => {
		const column = new TTableColumn({ field: 'name' })

		expect(column.sortable).toBe(false)
		expect(column.compare).toBeUndefined()
		expect(column.getProps()).toMatchObject({ sortable: false, compare: undefined })
	})

	it('sortable и compare — события только на смену', () => {
		const compare = (a: TTableRecord, b: TTableRecord) => Number(idOf(a)) - Number(idOf(b))
		const column = new TTableColumn({ field: 'name' })
		const sortable = vi.fn()
		const changed = vi.fn()

		column.events.on('change:sortable', sortable)
		column.events.on('change:compare', changed)

		column.sortable = true
		column.sortable = true
		column.compare = compare
		column.compare = compare

		expect(sortable.mock.calls).toEqual([[true]])
		expect(changed.mock.calls).toEqual([[compare]])
		expect(column.getProps()).toMatchObject({ sortable: true, compare })
	})

	it('язык таблицы — en-US по умолчанию, change:locale только на смену', () => {
		const owner = new TTable()
		const changed = vi.fn()

		owner.events.on('change:locale', changed)

		expect(owner.locale).toBe('en-US')

		owner.locale = 'en-US'
		owner.locale = 'ru-RU'

		expect(changed.mock.calls).toEqual([['ru-RU']])
		expect(owner.getProps()).toMatchObject({ locale: 'ru-RU' })
		expect(new TTable({ locale: 'de' }).locale).toBe('de')
	})
})

describe('цикл направления', () => {
	it('single: по возрастанию → по убыванию → снята', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.toggle('age')

		expect(sort.sort).toEqual([{ field: 'age', direction: 'asc' }])

		sort.toggle('age')

		expect(sort.sort).toEqual([{ field: 'age', direction: 'desc' }])

		sort.toggle('age')

		expect(sort.sort).toEqual([])
	})

	it('single: другая колонка заменяет прежнюю', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.toggle('age')
		sort.toggle('age')
		sort.toggle('name')

		expect(sort.sort).toEqual([{ field: 'name', direction: 'asc' }])
	})

	it('multiple: новая колонка — последней по приоритету, направление меняется на месте', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.sortMode = 'multiple'
		sort.toggle('age')
		sort.toggle('name')

		expect(sort.sort).toEqual([
			{ field: 'age', direction: 'asc' },
			{ field: 'name', direction: 'asc' },
		])

		sort.toggle('age')

		expect(sort.sort).toEqual([
			{ field: 'age', direction: 'desc' },
			{ field: 'name', direction: 'asc' },
		])
	})

	it('multiple: снятая колонка уходит, следующие поднимаются', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.sortMode = 'multiple'
		sort.sort = [
			{ field: 'age', direction: 'desc' },
			{ field: 'name', direction: 'asc' },
		]
		sort.toggle('age')

		expect(sort.sort).toEqual([{ field: 'name', direction: 'asc' }])
	})

	it('пользователь не сортирует несортируемую колонку, колонку, которой нет, и выключенную таблицу', () => {
		const owner = new TTable({ disabled: true })
		const engine = rows()
		const { sort } = engine.extensions
		const { sort: changed } = watch(engine)

		sort.toggle('id')
		sort.toggle('email')

		engine.options.set({ owner })
		sort.toggle('age')

		expect(sort.sort).toEqual([])
		expect(changed).not.toHaveBeenCalled()

		owner.disabled = false
		sort.toggle('age')

		expect(sort.sort).toEqual([{ field: 'age', direction: 'asc' }])
	})

	it('код сортирует и по несортируемой колонке, и по полю без колонки', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions

		sort.sort = [{ field: 'id', direction: 'desc' }]

		expect(ids(batch.shown)).toEqual([4, 3, 2, 1])

		sort.sort = [{ field: 'email', direction: 'asc' }]

		expect(sort.sort).toEqual([{ field: 'email', direction: 'asc' }])
		expect(ids(batch.shown)).toEqual([1, 2, 3, 4])
	})
})

describe('выборка, а не хранилище', () => {
	it('показанное упорядочено, состав — в порядке данных', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions

		sort.sort = [{ field: 'age', direction: 'desc' }]

		expect(ids(batch.shown)).toEqual([2, 1, 4, 3])
		expect(ids(batch.items)).toEqual([1, 2, 3, 4])
	})

	it('снятая сортировка возвращает порядок данных', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions

		sort.sort = [{ field: 'name', direction: 'desc' }]
		sort.sort = []

		expect(ids(batch.shown)).toEqual([1, 2, 3, 4])
	})

	it('несколько колонок: равные по первой — по следующей', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions

		sort.sortMode = 'multiple'
		sort.sort = [
			{ field: 'age', direction: 'asc' },
			{ field: 'name', direction: 'desc' },
		]

		// 25 Вера, 30 Глеб и Анна по имени по убыванию, 41 Борис
		expect(ids(batch.shown)).toEqual([3, 4, 1, 2])
	})

	it('устойчивая: равные остаются в порядке данных при любом направлении', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions

		sort.sort = [{ field: 'age', direction: 'asc' }]

		expect(ids(batch.shown)).toEqual([3, 1, 4, 2])

		sort.sort = [{ field: 'age', direction: 'desc' }]

		expect(ids(batch.shown)).toEqual([2, 1, 4, 3])
	})

	it('с отбором: показанное — отобранное и упорядоченное', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions
		const filter = new TFilterExtension<ITableRow>()

		engine.use(filter)
		filter.predicate = (row) => idOf(row.data) !== 1
		sort.sort = [{ field: 'age', direction: 'asc' }]

		expect(ids(batch.shown)).toEqual([3, 4, 2])
	})

	it('новые записи сверкой trackBy — новый порядок', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions
		const { shown } = watch(engine)

		sort.sort = [{ field: 'age', direction: 'asc' }]
		shown.mockClear()

		batch.items = [{ ...ANNA, age: 50 }, BORIS, VERA, GLEB].map(source)

		expect(shown).toHaveBeenCalledOnce()
		expect(ids(batch.shown)).toEqual([3, 4, 2, 1])
	})
})

describe('сравнение по умолчанию', () => {
	it('числа — по величине, а не как текст', () => {
		expect(shownValues(values([10, 9, 100, -1]), 'asc')).toEqual([-1, 9, 10, 100])
	})

	it('числа внутри строк — как числа', () => {
		expect(shownValues(values(['item10', 'item2', 'item1']), 'asc')).toEqual([
			'item1',
			'item2',
			'item10',
		])
	})

	it('пустые значения и строки без записи — в конце при любом направлении', () => {
		const engine = values([2, null, 1, undefined, Number.NaN, 3])

		engine.extensions.plain.push({})

		expect(shownValues(engine, 'asc')).toEqual([
			1,
			2,
			3,
			null,
			undefined,
			Number.NaN,
			'нет записи',
		])
		expect(shownValues(engine, 'desc')).toEqual([
			3,
			2,
			1,
			null,
			undefined,
			Number.NaN,
			'нет записи',
		])
	})

	it('дата — по времени, невалидная — пустая', () => {
		const march = new Date('2026-03-01')
		const december = new Date('2025-12-31')
		const invalid = new Date('не дата')

		expect(shownValues(values([march, invalid, december]), 'asc')).toEqual([
			december,
			march,
			invalid,
		])
	})

	it('булево — false раньше true; большое число — по величине', () => {
		expect(shownValues(values([true, false]), 'asc')).toEqual([false, true])
		expect(shownValues(values([10n, 9, 11]), 'asc')).toEqual([9, 10n, 11])
	})

	it('число и строка — как текст, числами внутри строк', () => {
		expect(shownValues(values([10, '9', 'a']), 'asc')).toEqual(['9', 10, 'a'])
	})

	it('значение без порядка — объект, массив, функция — пустое', () => {
		const object = { x: 1 }
		const list = [1]
		const fn = () => 0

		expect(shownValues(values([object, 2, list, fn, 1]), 'asc')).toEqual([
			1,
			2,
			object,
			list,
			fn,
		])
	})

	it('текст — по языку таблицы; смена языка — новый порядок', () => {
		const owner = new TTable({ locale: 'sv-SE' })
		const engine = values(['Zebra', 'Äpfel', 'Apfel'])
		const { shown } = watch(engine)

		engine.options.set({ owner })

		// По-шведски «ä» — после «z», по-немецки — рядом с «a»
		expect(shownValues(engine, 'asc')).toEqual(['Apfel', 'Zebra', 'Äpfel'])

		shown.mockClear()
		owner.locale = 'de-DE'

		expect(shown).toHaveBeenCalledOnce()
		expect(shownValues(engine, 'asc')).toEqual(['Apfel', 'Äpfel', 'Zebra'])
	})

	it('без таблицы и с невалидным языком — en-US, а не исключение', () => {
		const engine = values(['Zebra', 'Äpfel', 'Apfel'])

		expect(shownValues(engine, 'asc')).toEqual(['Apfel', 'Äpfel', 'Zebra'])

		engine.options.set({ owner: new TTable({ locale: 'не язык' }) })

		expect(shownValues(engine, 'asc')).toEqual(['Apfel', 'Äpfel', 'Zebra'])
	})
})

describe('своё сравнение колонки', () => {
	const RANK: Readonly<Record<string, number>> = { low: 0, medium: 1, high: 2 }

	/** Приоритет задачи в записи; нет — ниже всех. */
	function rankOf(data: TTableRecord): number {
		return 'level' in data && typeof data.level === 'string' ? (RANK[data.level] ?? -1) : -1
	}

	const byRank = (a: TTableRecord, b: TTableRecord): number => rankOf(a) - rankOf(b)

	const TASKS = [
		{ id: 1, level: 'medium' },
		{ id: 2, level: 'high' },
		{ id: 3, level: 'low' },
	]

	it('сравнивает записи; по убыванию — порядок наоборот; строка без записи — в конце', () => {
		const engine = rows(TASKS, [{ field: 'level', sortable: true, compare: byRank }])
		const { sort, batch, plain } = engine.extensions

		plain.push({})
		sort.sort = [{ field: 'level', direction: 'asc' }]

		expect(ids(batch.shown)).toEqual([3, 1, 2, undefined])

		sort.sort = [{ field: 'level', direction: 'desc' }]

		expect(ids(batch.shown)).toEqual([2, 1, 3, undefined])
	})

	it('смена сравнения отсортированной колонки — показанное устарело, другой — нет', () => {
		const engine = rows(TASKS, [
			{ field: 'level', sortable: true },
			{ field: 'id', sortable: true },
		])
		const { sort, batch } = engine.extensions

		sort.sort = [{ field: 'level', direction: 'asc' }]

		// Без своего сравнения — по тексту: high, low, medium
		expect(ids(batch.shown)).toEqual([2, 3, 1])

		const { shown } = watch(engine)

		columnOf(engine, 'id').compare = byRank

		expect(shown).not.toHaveBeenCalled()

		columnOf(engine, 'level').compare = byRank

		expect(shown).toHaveBeenCalledOnce()
		expect(ids(batch.shown)).toEqual([3, 1, 2])
	})

	it('колонка пришла после сортировки — пометки и её сравнение', () => {
		const engine = rows(TASKS, [])
		const { sort, batch, columns } = engine.extensions

		sort.sort = [{ field: 'level', direction: 'asc' }]

		expect(ids(batch.shown)).toEqual([2, 3, 1])

		const { sort: changed, shown } = watch(engine)

		columns.engine.extensions.plain.push(new TTableColumn({ field: 'level', compare: byRank }))

		expect(ids(batch.shown)).toEqual([3, 1, 2])
		expect(shown).toHaveBeenCalledOnce()
		expect(changed).not.toHaveBeenCalled()
		expect(marksOf(columnOf(engine, 'level'))).toEqual({
			sort: 'asc',
			priority: '1',
			aria: 'ascending',
		})
	})
})

describe('пометки колонок', () => {
	it('data-sort и приоритет — всем отсортированным, aria-sort — только первой', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.sortMode = 'multiple'
		sort.sort = [
			{ field: 'age', direction: 'desc' },
			{ field: 'name', direction: 'asc' },
		]

		expect(marksOf(columnOf(engine, 'age'))).toEqual({
			sort: 'desc',
			priority: '1',
			aria: 'descending',
		})
		expect(marksOf(columnOf(engine, 'name'))).toEqual({
			sort: 'asc',
			priority: '2',
			aria: undefined,
		})
		expect(marksOf(columnOf(engine, 'id'))).toEqual(NO_MARKS)
	})

	it('снятая сортировка снимает пометки; приоритет следующих — сдвигается', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.sortMode = 'multiple'
		sort.sort = [
			{ field: 'age', direction: 'desc' },
			{ field: 'name', direction: 'asc' },
		]
		sort.toggle('age')

		expect(marksOf(columnOf(engine, 'age'))).toEqual(NO_MARKS)
		expect(marksOf(columnOf(engine, 'name'))).toEqual({
			sort: 'asc',
			priority: '1',
			aria: 'ascending',
		})
	})

	it('пометки ставятся и в режиме presorted', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.presorted = true
		sort.toggle('age')

		expect(marksOf(columnOf(engine, 'age'))).toEqual({
			sort: 'asc',
			priority: '1',
			aria: 'ascending',
		})
	})
})

describe('события', () => {
	it('change:sort — с новым состоянием, показанное устарело — одно на смену', () => {
		const engine = rows()
		const { sort } = engine.extensions
		const events = watch(engine)

		sort.toggle('age')

		expect(events.sort.mock.calls).toEqual([[[{ field: 'age', direction: 'asc' }]]])
		expect(events.shown).toHaveBeenCalledOnce()
	})

	it('тот же список, собранный заново, — не смена: эхо модели и литерал', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.sort = [{ field: 'age', direction: 'asc' }]

		const events = watch(engine)

		sort.sort = sort.sort
		sort.sort = [{ field: 'age', direction: 'asc' }]

		expect(events.sort).not.toHaveBeenCalled()
		expect(events.shown).not.toHaveBeenCalled()
	})

	it('повтор поля — по первой записи; в single — только первая колонка', () => {
		const engine = rows()
		const { sort } = engine.extensions

		sort.sortMode = 'multiple'
		sort.sort = [
			{ field: 'age', direction: 'asc' },
			{ field: 'name', direction: 'asc' },
			{ field: 'age', direction: 'desc' },
		]

		expect(sort.sort).toEqual([
			{ field: 'age', direction: 'asc' },
			{ field: 'name', direction: 'asc' },
		])

		sort.sortMode = 'single'
		sort.sort = [
			{ field: 'name', direction: 'desc' },
			{ field: 'age', direction: 'asc' },
		]

		expect(sort.sort).toEqual([{ field: 'name', direction: 'desc' }])
	})

	it('состояние — значение: правка отданного списка его не меняет', () => {
		const engine = rows()
		const { sort } = engine.extensions
		const written: TTableColumnSort[] = [{ field: 'age', direction: 'asc' }]

		sort.sort = written
		written.push({ field: 'name', direction: 'asc' })
		sort.sort.pop()

		expect(sort.sort).toEqual([{ field: 'age', direction: 'asc' }])
		expect(sort.sort).not.toBe(sort.sort)
	})
})

describe('режим', () => {
	it('multiple → single оставляет колонку с высшим приоритетом; события — состояние, потом режим', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions
		const seen: string[] = []

		sort.sortMode = 'multiple'
		sort.sort = [
			{ field: 'age', direction: 'asc' },
			{ field: 'name', direction: 'desc' },
		]
		sort.events.on('change:sort', () => seen.push('sort'))
		sort.events.on('change:sortMode', (mode) => seen.push(mode))
		sort.sortMode = 'single'

		expect(sort.sort).toEqual([{ field: 'age', direction: 'asc' }])
		expect(seen).toEqual(['sort', 'single'])
		expect(ids(batch.shown)).toEqual([3, 1, 4, 2])
	})

	it('single → multiple состояние не трогает', () => {
		const engine = rows()
		const { sort } = engine.extensions
		const events = watch(engine)

		sort.toggle('age')
		sort.sortMode = 'multiple'

		expect(sort.sort).toEqual([{ field: 'age', direction: 'asc' }])
		expect(events.sort).toHaveBeenCalledOnce()
		expect(events.shown).toHaveBeenCalledOnce()
	})
})

describe('строки, упорядоченные снаружи', () => {
	it('presorted: состояние и события есть, показанное — в порядке данных', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions
		const events = watch(engine)

		sort.presorted = true
		sort.toggle('age')

		expect(sort.sort).toEqual([{ field: 'age', direction: 'asc' }])
		expect(events.sort).toHaveBeenCalledOnce()
		expect(events.shown).not.toHaveBeenCalled()
		expect(ids(batch.shown)).toEqual([1, 2, 3, 4])
	})

	it('смена режима переставляет показанное, если есть по чему сортировать', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions
		const presorted = vi.fn()

		sort.events.on('change:presorted', presorted)
		sort.presorted = true

		const { shown } = watch(engine)

		sort.presorted = false

		expect(shown).not.toHaveBeenCalled()

		sort.sort = [{ field: 'age', direction: 'desc' }]
		shown.mockClear()
		sort.presorted = true

		expect(shown).toHaveBeenCalledOnce()
		expect(ids(batch.shown)).toEqual([1, 2, 3, 4])

		sort.presorted = false

		expect(shown).toHaveBeenCalledTimes(2)
		expect(ids(batch.shown)).toEqual([2, 1, 4, 3])
		expect(presorted.mock.calls).toEqual([[true], [false], [true], [false]])
	})
})

describe('колонка ушла, скрыта, сменила поле', () => {
	/** Коллекция, отсортированная по возрасту по убыванию, потом по имени. */
	function sorted() {
		const engine = rows()

		engine.extensions.sort.sortMode = 'multiple'
		engine.extensions.sort.sort = [
			{ field: 'age', direction: 'desc' },
			{ field: 'name', direction: 'asc' },
		]

		return engine
	}

	it('ушла из данных — её сортировка снимается, пометки — с неё', () => {
		const engine = sorted()
		const age = columnOf(engine, 'age')
		const events = watch(engine)

		engine.extensions.columns.columns = [NAME, ID]

		expect(engine.extensions.sort.sort).toEqual([{ field: 'name', direction: 'asc' }])
		expect(events.sort).toHaveBeenCalledOnce()
		expect(events.shown).toHaveBeenCalledOnce()
		expect(marksOf(age)).toEqual(NO_MARKS)
		expect(marksOf(columnOf(engine, 'name'))).toEqual({
			sort: 'asc',
			priority: '1',
			aria: 'ascending',
		})
	})

	it('удалена из коллекции колонок и коллекцию очистили', () => {
		const engine = sorted()
		const { plain, batch } = engine.extensions.columns.engine.extensions

		plain.remove(columnOf(engine, 'age'))

		expect(engine.extensions.sort.sort).toEqual([{ field: 'name', direction: 'asc' }])

		batch.clear()

		expect(engine.extensions.sort.sort).toEqual([])
	})

	it('поле без колонки другие колонки не снимают', () => {
		const engine = rows()
		const { sort, columns } = engine.extensions

		sort.sort = [{ field: 'email', direction: 'asc' }]
		columns.columns = [NAME]

		expect(sort.sort).toEqual([{ field: 'email', direction: 'asc' }])
	})

	it('скрыта — сортировка остаётся и упорядочивает строки; показана — та же', () => {
		const engine = sorted()
		const age = columnOf(engine, 'age')
		const events = watch(engine)

		age.hide()

		expect(engine.extensions.sort.sort).toEqual([
			{ field: 'age', direction: 'desc' },
			{ field: 'name', direction: 'asc' },
		])
		expect(ids(engine.extensions.batch.shown)).toEqual([2, 1, 4, 3])
		expect(marksOf(age)).toEqual({ sort: 'desc', priority: '1', aria: 'descending' })

		age.show()

		expect(events.sort).not.toHaveBeenCalled()
		expect(events.shown).not.toHaveBeenCalled()
	})

	it('сменила поле — для сортировки колонка поля ушла, а пришла другая', () => {
		const engine = sorted()
		const age = columnOf(engine, 'age')
		const events = watch(engine)

		age.field = 'id'

		expect(engine.extensions.sort.sort).toEqual([{ field: 'name', direction: 'asc' }])
		expect(events.sort).toHaveBeenCalledOnce()
		expect(marksOf(age)).toEqual(NO_MARKS)
	})
})

describe('фасад коллекции строк', () => {
	/** Фасад над четырьмя записями. */
	function table(props: { sortMode?: TTableSortMode; sort?: TTableColumnSort[] } = {}) {
		return new TTableCollectionFacade({
			items: [ANNA, BORIS, VERA, GLEB].map(source),
			trackBy: (row) => idOf(row.data),
			columns: [NAME, AGE, ID],
			...props,
		})
	}

	it('сортировка пропсами: режим — до состояния', () => {
		const facade = table({
			sortMode: 'multiple',
			sort: [
				{ field: 'age', direction: 'asc' },
				{ field: 'name', direction: 'desc' },
			],
		})

		expect(facade.sortMode).toBe('multiple')
		expect(facade.sort).toHaveLength(2)
		expect(ids(facade.shown)).toEqual([3, 4, 1, 2])
	})

	it('presorted пропом — строки в порядке данных', () => {
		const facade = new TTableCollectionFacade({
			items: [ANNA, BORIS].map(source),
			columns: [AGE],
			sort: [{ field: 'age', direction: 'desc' }],
			presorted: true,
		})

		expect(facade.presorted).toBe(true)
		expect(ids(facade.shown)).toEqual([1, 2])
	})

	it('команда пользователя и события сортировки доходят до фасада', () => {
		const facade = table()
		const sort = vi.fn()
		const mode = vi.fn()
		const presorted = vi.fn()

		facade.events.on('change:sort', sort)
		facade.events.on('change:sortMode', mode)
		facade.events.on('change:presorted', presorted)

		facade.toggleSort('age')
		facade.sortMode = 'multiple'
		facade.presorted = true

		expect(sort.mock.calls).toEqual([[[{ field: 'age', direction: 'asc' }]]])
		expect(mode.mock.calls).toEqual([['multiple']])
		expect(presorted.mock.calls).toEqual([[true]])
	})

	it('незаданная сортировка — порядок данных', () => {
		const facade = table({ sort: [{ field: 'age', direction: 'asc' }] })

		facade.sort = undefined

		expect(facade.sort).toEqual([])
		expect(ids(facade.shown)).toEqual([1, 2, 3, 4])
	})

	it('умолчания: одна колонка, строки переставляет таблица, сортировка не задана', () => {
		const defaults = TTableCollectionFacade.defaultValues

		expect(defaults).toMatchObject({ sortMode: 'single', presorted: false })
		expect('sort' in defaults).toBe(true)
		expect(defaults.sort).toBeUndefined()
	})

	it('движок снаружи переносит сортировку; пустая сортировка пропом её не снимает', () => {
		const engine = rows()

		engine.extensions.sort.sort = [{ field: 'age', direction: 'desc' }]

		const facade = new TTableCollectionFacade({ sort: [] }, { engine })

		expect(facade.sort).toEqual([{ field: 'age', direction: 'desc' }])
		expect(ids(facade.shown)).toEqual([2, 1, 4, 3])
	})

	it('движок уровня 1: фасад доставит сортировку', () => {
		const engine = createEngine<ITableRow>({ items: [ANNA, BORIS].map(source) })
		const facade = new TTableCollectionFacade(
			{ columns: [AGE], sort: [{ field: 'age', direction: 'desc' }] },
			{ engine },
		)

		expect(ids(facade.shown)).toEqual([2, 1])
	})
})

describe('память выборки', () => {
	/** Счётчик выборок: каждая — сортировка всех строк. Ставится до действия. */
	function watchQueries(engine: TTableCollection) {
		const queries = vi.fn()

		engine.getCore().driver.events.on('items:query:before', queries)

		return queries
	}

	/** Значения поля `v` показанных строк — в показанном порядке. */
	const shownV = (engine: TTableCollection): unknown[] =>
		engine.extensions.batch.shown.map((row) =>
			row.data && 'v' in row.data ? row.data.v : 'нет записи',
		)

	// Показанные строки на `change:shown` читает и сама таблица — пересчитывает
	// выбор показанных. С памятью читатель после неё получает ту же сортировку
	it('смена сортировки — одна сортировка на всех читателей, тот же массив', () => {
		const engine = rows()
		const { sort, batch } = engine.extensions
		const queries = watchQueries(engine)

		sort.sort = [{ field: 'age', direction: 'desc' }]

		const shown = batch.shown

		expect(ids(shown)).toEqual([2, 1, 4, 3])
		expect(batch.shown).toBe(shown)
		expect(batch.length).toBe(4)
		expect(queries).toHaveBeenCalledOnce()
	})

	it('смена сортировки, языка и сравнения колонки — сортировка заново, по одной на смену', () => {
		const RANK: Readonly<Record<string, number>> = { Zebra: 0, Äpfel: 1, Apfel: 2 }
		const rankOf = (data: TTableRecord): number =>
			'v' in data && typeof data.v === 'string' ? (RANK[data.v] ?? -1) : -1
		const owner = new TTable({ locale: 'sv-SE' })
		const engine = values(['Zebra', 'Äpfel', 'Apfel'])
		const { sort } = engine.extensions
		const queries = watchQueries(engine)

		engine.options.set({ owner })
		sort.sort = [{ field: 'v', direction: 'asc' }]

		// По-шведски «ä» — после «z»
		expect(shownV(engine)).toEqual(['Apfel', 'Zebra', 'Äpfel'])

		sort.sort = [{ field: 'v', direction: 'desc' }]

		expect(shownV(engine)).toEqual(['Äpfel', 'Zebra', 'Apfel'])

		owner.locale = 'de-DE'

		expect(shownV(engine)).toEqual(['Zebra', 'Äpfel', 'Apfel'])

		columnOf(engine, 'v').compare = (a, b) => rankOf(a) - rankOf(b)

		expect(shownV(engine)).toEqual(['Apfel', 'Äpfel', 'Zebra'])
		expect(shownV(engine)).toEqual(['Apfel', 'Äpfel', 'Zebra'])
		expect(queries).toHaveBeenCalledTimes(4)
	})
})

describe('расширение снаружи', () => {
	it('состояние, записанное до установки, применяется при установке', () => {
		const engine = createEngine<ITableRow>({ items: [ANNA, BORIS, VERA].map(source) })
		const sort = new TTableSortExtension()
		const shown = vi.fn()

		engine.extensions.batch.events.on('change:shown', shown)
		sort.sort = [{ field: 'age', direction: 'asc' }]
		engine.use(sort)

		expect(shown).toHaveBeenCalledOnce()
		expect(ids(engine.extensions.batch.shown)).toEqual([3, 1, 2])
	})

	it('без колонок: код сортирует по полю, команде пользователя сортировать нечего', () => {
		const engine = createEngine<ITableRow>({ items: [ANNA, BORIS, VERA].map(source) })
		const sort = new TTableSortExtension()

		engine.use(sort)
		sort.toggle('age')

		expect(sort.sort).toEqual([])

		sort.sort = [{ field: 'age', direction: 'desc' }]

		expect(ids(engine.extensions.batch.shown)).toEqual([2, 1, 3])
	})
})
