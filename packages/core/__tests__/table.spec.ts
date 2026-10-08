import { describe, it, expect, vi } from 'vitest'
import {
	TFilterExtension,
	TItemContext,
	TTable,
	TTableCollectionFacade,
	TTableColumn,
	TTableRow,
	TTableRowCollectionFacade,
	createEngine,
	createEngineTable,
} from '@soldy-ui/core'
import type {
	ITableColumn,
	ITableRow,
	TSelectionMode,
	TTableCollection,
	TTableColumnSource,
	TTableRecord,
} from '@soldy-ui/core'

/**
 * Таблица — владелец коллекции строк, как ListBox — владелец опций.
 *
 * Строка — элемент коллекции над записью приложения (`data`). Ячейки не
 * хранятся: это выход строки — её запись по показанным колонкам расширения
 * `columns`. Выбор строк — стандартный `selection`; сколько показанных строк
 * выбрано и команды чекбокса шапки — расширение `table`.
 *
 * Свойства таблицы на строках (`disabled`, `size`, `variant`) стерегут общие
 * сценарии всех коллекций: `collection-disabled-inherit.spec.ts` и
 * `collection-style-inherit.spec.ts`.
 */

const ANNA = { id: 1, name: 'Анна', age: 30 }
const BORIS = { id: 2, name: 'Борис', age: 41 }
const VERA = { id: 3, name: 'Вера', age: 25 }

const NAME: TTableColumnSource = { field: 'name', text: 'Имя' }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', align: 'end' }
const ID: TTableColumnSource = { field: 'id', text: '№' }

/** Источник строки — запись приложения. */
const source = (data: TTableRecord) => ({ data })

/** Ключ записи — её `id`. Записи или поля нет — ключа нет. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

const fields = (columns: ReadonlyArray<ITableColumn>): string[] =>
	columns.map((column) => column.field)

/** Колонка по полю; нет такой — тест падает здесь. */
function columnOf(columns: ReadonlyArray<ITableColumn>, field: string): ITableColumn {
	const found = columns.find((column) => column.field === field)

	if (!found) throw new Error(`колонки ${field} нет`)

	return found
}

/** Строка по ключу записи; нет такой — тест падает здесь. */
function rowOf(rows: ReadonlyArray<ITableRow>, id: number): ITableRow {
	const found = rows.find((row) => idOf(row.data) === id)

	if (!found) throw new Error(`строки ${id} нет`)

	return found
}

/** Коллекция строк с записями и колонками; строки сверяются по `id` записи. */
function rows(
	records: readonly TTableRecord[] = [ANNA, BORIS],
	columns: readonly TTableColumnSource[] = [NAME, AGE],
): TTableCollection {
	const engine = createEngineTable({ items: records.map(source) })

	engine.extensions.batch.trackBy = (row) => idOf(row.data)
	engine.extensions.columns.columns = columns

	return engine
}

/** Фасад строки в коллекции — так её ячейки видит разметка. */
function facadeOf(engine: TTableCollection, row: ITableRow): TTableRowCollectionFacade {
	const facade = new TTableRowCollectionFacade()

	facade.setContext(new TItemContext(row, engine.getCore().extensions))

	return facade
}

/** Счётчик «перечитай ячейки» строки — ставится до действия. */
function watchCells(facade: TTableRowCollectionFacade) {
	const cells = vi.fn<() => void>()

	facade.events.on('change:cells', cells)

	return cells
}

/** Фасад коллекции строк над тремя записями. */
function table(mode: TSelectionMode = 'single'): TTableCollectionFacade {
	return new TTableCollectionFacade({
		items: [ANNA, BORIS, VERA].map(source),
		trackBy: (row) => idOf(row.data),
		columns: [NAME, AGE],
		mode,
	})
}

/**
 * Сколько обработчиков события висит на колонке — считая с вызова, поэтому
 * ставится до того, как колонка попадёт в коллекцию.
 */
function watchListeners(column: ITableColumn, event: string): () => number {
	const on = vi.spyOn(column.events, 'on')
	const off = vi.spyOn(column.events, 'off')
	const count = (calls: ReadonlyArray<readonly unknown[]>) =>
		calls.filter(([name]) => name === event).length

	return () => count(on.mock.calls) - count(off.mock.calls)
}

describe('таблица и строка', () => {
	it('корень таблицы — table', () => {
		const owner = new TTable()

		expect(owner.tag).toBe('table')
		expect(owner.classes.base).toBe('s-table')
	})

	it('строка — запись приложения, корень — tr', () => {
		const row = new TTableRow({ data: ANNA })

		expect(row.tag).toBe('tr')
		expect(row.classes.base).toBe('s-table-row')
		expect(row.data).toBe(ANNA)
		expect(row.getProps()).toMatchObject({ data: ANNA })
		expect(new TTableRow().data).toBeUndefined()
	})

	it('change:data — только на другую запись', () => {
		const row = new TTableRow({ data: ANNA })
		const changed = vi.fn()

		row.events.on('change:data', changed)

		row.data = ANNA

		expect(changed).not.toHaveBeenCalled()

		row.data = BORIS

		expect(changed).toHaveBeenCalledOnce()
		expect(changed).toHaveBeenLastCalledWith(BORIS)
	})

	it('выключенная строка — aria-disabled на tr и data-disabled для темы', () => {
		const row = new TTableRow({ data: ANNA, disabled: true })

		expect(row.aria.get('aria-disabled')).toBe('true')
		expect(row.dataset.get('disabled')).toBe('true')
		expect(row.attrs.has('disabled')).toBe(false)
	})
})

describe('строки из данных', () => {
	it('строки — TTableRow над записями, в порядке данных', () => {
		const engine = rows([ANNA, BORIS])
		const { items } = engine.extensions.batch

		expect(items.every((row) => row instanceof TTableRow)).toBe(true)
		expect(items.map((row) => row.data)).toEqual([ANNA, BORIS])
	})

	it('повтор теми же записями — те же экземпляры, записи на месте', () => {
		const engine = rows([ANNA, BORIS])
		const { batch } = engine.extensions
		const before = [...batch.items]
		const changed = vi.fn()

		before.forEach((row) => row.events.on('change:data', changed))

		batch.items = [ANNA, BORIS].map(source)

		expect(batch.items).toHaveLength(2)
		batch.items.forEach((row, index) => expect(row).toBe(before[index]))
		expect(changed).not.toHaveBeenCalled()
	})

	it('новая запись с тем же ключом — та же строка с новой записью', () => {
		const engine = rows([ANNA, BORIS])
		const { batch } = engine.extensions
		const anna = rowOf(batch.items, 1)
		const older = { ...ANNA, age: 31 }

		batch.items = [source(older), source(BORIS)]

		expect(rowOf(batch.items, 1)).toBe(anna)
		expect(anna.data).toBe(older)
	})

	it('пропавшая запись удаляет строку, новая встаёт в конец', () => {
		const engine = rows([ANNA, BORIS])
		const { batch } = engine.extensions
		const boris = rowOf(batch.items, 2)

		batch.items = [VERA, ANNA].map(source)

		expect(batch.items.map((row) => idOf(row.data))).toEqual([1, 3])
		expect(batch.items).not.toContain(boris)
	})

	it('выбор переживает повтор теми же записями', () => {
		const facade = table('multiple')
		const boris = rowOf(facade.items, 2)

		facade.extensions.selection.select(boris)
		facade.items = [ANNA, BORIS, VERA].map(source)

		expect(rowOf(facade.items, 2)).toBe(boris)
		expect(facade.selected).toEqual([boris])
	})

	it('строка выбрана из данных — meta', () => {
		const facade = new TTableCollectionFacade({
			items: [source(ANNA), { data: BORIS, _: { selected: true } }],
			mode: 'multiple',
		})

		expect(facade.selected).toEqual([rowOf(facade.items, 2)])
		expect(facade.shownSelection).toBe('some')
	})
})

describe('ячейки', () => {
	it('по ячейке на показанную колонку, в порядке колонок: колонка, значение, выравнивание', () => {
		const engine = rows([ANNA], [NAME, AGE])
		const { cells } = facadeOf(engine, rowOf(engine.extensions.batch.items, 1))
		const { columns } = engine.extensions.columns

		expect(cells.map((cell) => cell.column)).toEqual([...columns])
		expect(cells.map((cell) => cell.value)).toEqual(['Анна', 30])
		expect(cells.map((cell) => cell.dataset)).toEqual([
			{ 'data-align': 'start' },
			{ 'data-align': 'end' },
		])
	})

	it('скрытая колонка ячейки не даёт, перестановка колонок переставляет ячейки', () => {
		const engine = rows([ANNA], [NAME, AGE, ID])
		const facade = facadeOf(engine, rowOf(engine.extensions.batch.items, 1))
		const { columns } = engine.extensions

		columnOf(columns.columns, 'age').hide()
		columns.engine.extensions.plain.move(columnOf(columns.columns, 'id'), 0)

		expect(facade.cells.map((cell) => cell.value)).toEqual([1, 'Анна'])
		expect(fields(facade.cells.map((cell) => cell.column))).toEqual(['id', 'name'])
	})

	it('поля нет в записи — значения нет; у строки без записи — ни одного значения', () => {
		const engine = rows([ANNA], [NAME, { field: 'email' }])
		const empty = engine.extensions.plain.push({})

		expect(facadeOf(engine, rowOf(engine.extensions.batch.items, 1)).cells[1].value).toBe(
			undefined,
		)
		expect(facadeOf(engine, empty).cells.map((cell) => cell.value)).toEqual([
			undefined,
			undefined,
		])
	})

	it('ячейки — значение: каждое чтение собирает их заново', () => {
		const engine = rows([ANNA])
		const facade = facadeOf(engine, rowOf(engine.extensions.batch.items, 1))
		const first = facade.cells

		expect(facade.cells).not.toBe(first)
		expect(facade.cells).toEqual(first)
	})

	it('вне коллекции у строки ячеек нет', () => {
		expect(new TTableRowCollectionFacade().cells).toEqual([])
	})

	it('без колонок ячеек нет', () => {
		const engine = rows([ANNA], [])

		expect(facadeOf(engine, rowOf(engine.extensions.batch.items, 1)).cells).toEqual([])
	})
})

describe('событие ячеек — одно на смену', () => {
	/** Строка Анны в коллекции и её счётчик ячеек. */
	function anna(records: readonly TTableRecord[] = [ANNA, BORIS]) {
		const engine = rows(records)
		const facade = facadeOf(engine, rowOf(engine.extensions.batch.items, 1))

		return { engine, facade, cells: watchCells(facade), columns: engine.extensions.columns }
	}

	it('запись строки сменилась — ячейки этой строки, и только её', () => {
		const { engine, facade, cells } = anna()
		const boris = watchCells(facadeOf(engine, rowOf(engine.extensions.batch.items, 2)))
		const row = rowOf(engine.extensions.batch.items, 1)

		row.data = { ...ANNA, name: 'Анна Петровна' }

		expect(cells).toHaveBeenCalledOnce()
		expect(boris).not.toHaveBeenCalled()
		expect(facade.cells[0].value).toBe('Анна Петровна')
	})

	it('патч данными: новая запись строки — событие её ячеек', () => {
		const { engine, facade, cells } = anna()
		const boris = watchCells(facadeOf(engine, rowOf(engine.extensions.batch.items, 2)))

		engine.extensions.batch.items = [source({ ...ANNA, age: 31 }), source(BORIS)]

		expect(cells).toHaveBeenCalledOnce()
		expect(boris).not.toHaveBeenCalled()
		expect(facade.cells[1].value).toBe(31)
	})

	it('колонку добавили и удалили', () => {
		const { cells, columns } = anna()

		columns.columns = [NAME, AGE, ID]

		expect(cells).toHaveBeenCalledTimes(1)

		columns.columns = [NAME, ID]

		expect(cells).toHaveBeenCalledTimes(2)
	})

	it('колонку скрыли, показали и переставили', () => {
		const { cells, columns } = anna()
		const age = columnOf(columns.columns, 'age')

		age.hide()
		age.show()
		columns.engine.extensions.plain.move(age, 0)

		expect(cells).toHaveBeenCalledTimes(3)
	})

	it('выравнивание и поле показанной колонки', () => {
		const { facade, cells, columns } = anna()
		const name = columnOf(columns.columns, 'name')

		name.align = 'center'

		expect(cells).toHaveBeenCalledTimes(1)
		expect(facade.cells[0].dataset).toEqual({ 'data-align': 'center' })

		name.field = 'id'

		expect(cells).toHaveBeenCalledTimes(2)
		expect(facade.cells[0].value).toBe(1)
	})

	it('выравнивание скрытой колонки ячеек не трогает; показанная снова — с новым', () => {
		const { facade, cells, columns } = anna()
		const age = columnOf(columns.columns, 'age')

		age.hide()
		cells.mockClear()

		age.align = 'center'

		expect(cells).not.toHaveBeenCalled()

		age.show()

		expect(cells).toHaveBeenCalledOnce()
		expect(facade.cells[1].dataset).toEqual({ 'data-align': 'center' })
	})

	it('запись колонок, сменившая и состав, и выравнивание, — одно событие в её конце', () => {
		const { facade, cells, columns } = anna()
		const shown = vi.fn()
		const seen: unknown[][] = []

		columns.events.on('change:shownColumns', shown)
		facade.events.on('change:cells', () => seen.push(facade.cells.map((cell) => cell.value)))

		columns.columns = [{ ...NAME, align: 'end' }, ID]

		expect(cells).toHaveBeenCalledOnce()
		expect(shown).toHaveBeenCalledOnce()
		expect(seen).toEqual([['Анна', 1]])
	})

	it('запись колонок, сменившая только выравнивание, — ячейки, но не показанные', () => {
		const { cells, columns } = anna()
		const shown = vi.fn()

		columns.events.on('change:shownColumns', shown)
		columns.columns = [{ ...NAME, align: 'center' }, AGE]

		expect(cells).toHaveBeenCalledOnce()
		expect(shown).not.toHaveBeenCalled()
	})

	it('заголовок и ширина ячеек не трогают', () => {
		const { cells, columns } = anna()
		const name = columnOf(columns.columns, 'name')

		name.text = 'ФИО'
		name.width = 200
		columns.columns = [{ ...NAME, text: 'Имя и фамилия' }, AGE]

		expect(cells).not.toHaveBeenCalled()
	})

	it('удалённую и скрытую колонку ячейки больше не слушают', () => {
		const { cells, columns } = anna()
		const email = new TTableColumn({ field: 'email' })
		const align = watchListeners(email, 'change:align')
		const field = watchListeners(email, 'change:field')
		const { plain } = columns.engine.extensions

		plain.push(email)

		expect([align(), field()]).toEqual([1, 1])

		email.hide()

		expect([align(), field()]).toEqual([0, 0])

		email.show()
		plain.remove(email)

		expect([align(), field()]).toEqual([0, 0])

		cells.mockClear()
		email.align = 'end'

		expect(cells).not.toHaveBeenCalled()
	})
})

describe('выбор строк', () => {
	// Режим решает и выбор, и колонку выбора: без просьбы потребителя колонки
	// чекбоксов у таблицы нет
	it('режим по умолчанию — none: выбрать строку нельзя', () => {
		const facade = new TTableCollectionFacade({ items: [ANNA, BORIS].map(source) })
		const [anna] = facade.items

		expect(facade.mode).toBe('none')
		expect(createEngineTable().extensions.selection.mode).toBe('none')

		facade.extensions.selection.select(anna)

		expect(facade.selected).toEqual([])
	})

	it('single: выбор строки снимает выбор с другой', () => {
		const facade = table('single')
		const [anna, boris] = facade.items
		const { selection } = facade.extensions

		selection.select(anna)
		selection.select(boris)

		expect(facade.selected).toEqual([boris])
	})

	it('multiple: выбрано несколько строк', () => {
		const facade = table('multiple')
		const [anna, boris] = facade.items
		const { selection } = facade.extensions

		selection.select(anna)
		selection.select(boris)

		expect(facade.selected).toEqual([anna, boris])
	})

	it('строку выбирает фасад строки', () => {
		const facade = table('multiple')
		const boris = rowOf(facade.items, 2)
		const row = facadeOf(facade.engine, boris)
		const selected = vi.fn()

		row.events.on('change:selected', selected)
		row.selected = true

		expect(facade.selected).toEqual([boris])
		expect(row.selected).toBe(true)
		expect(selected).toHaveBeenCalledOnce()
	})

	it('data-selected — всем строкам, aria-selected — ни одной: у роли table выбора нет', () => {
		const facade = table('multiple')
		const [anna, boris] = facade.items

		facade.extensions.selection.select(anna)

		expect(anna.dataset.get('selected')).toBe('true')
		expect(boris.dataset.get('selected')).toBe('false')
		expect(facade.items.some((row) => row.aria.has('aria-selected'))).toBe(false)
	})
})

describe('выбраны все показанные', () => {
	it('ни одной, часть, все — событие только на смену', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items
		const { selection } = facade.extensions
		const changed = vi.fn()

		facade.events.on('change:shownSelection', changed)

		expect(facade.shownSelection).toBe('none')

		selection.select(anna)
		selection.select(boris)

		expect(facade.shownSelection).toBe('some')

		selection.select(vera)

		expect(facade.shownSelection).toBe('all')

		selection.deselect(boris)
		selection.resetSelection()

		expect(facade.shownSelection).toBe('none')
		expect(changed.mock.calls).toEqual([['some'], ['all'], ['some'], ['none']])
	})

	it('выбрать все показанные — одно событие', () => {
		const facade = table('multiple')
		const changed = vi.fn()

		facade.events.on('change:shownSelection', changed)
		facade.selectShown()

		expect(facade.selected).toEqual([...facade.items])
		expect(facade.shownSelection).toBe('all')
		expect(changed.mock.calls).toEqual([['all']])
	})

	it('снять выбор с показанных — одно событие', () => {
		const facade = table('multiple')
		const changed = vi.fn()

		facade.selectShown()
		facade.events.on('change:shownSelection', changed)
		facade.deselectShown()

		expect(facade.selected).toEqual([])
		expect(changed.mock.calls).toEqual([['none']])
	})

	it('выключенная строка в счёт не входит, и команды её не трогают', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items
		const { selection } = facade.extensions

		vera.disabled = true
		facade.selectShown()

		expect(facade.selected).toEqual([anna, boris])
		expect(facade.shownSelection).toBe('all')

		// Выключенную строку выбрал код — чекбоксом шапки её выбор не снять
		selection.select(vera)
		facade.deselectShown()

		expect(facade.selected).toEqual([vera])
		expect(facade.shownSelection).toBe('none')
	})

	it('строку выключили или включили — счёт пересчитан', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items
		const changed = vi.fn()

		facade.extensions.selection.select(anna)
		facade.extensions.selection.select(boris)
		facade.events.on('change:shownSelection', changed)

		vera.disabled = true

		expect(facade.shownSelection).toBe('all')

		vera.disabled = false

		expect(facade.shownSelection).toBe('some')
		expect(changed.mock.calls).toEqual([['all'], ['some']])
	})

	it('все строки выключены — выбирать нечего: empty', () => {
		const facade = table('multiple')
		const changed = vi.fn()

		facade.events.on('change:shownSelection', changed)
		facade.items.forEach((row) => (row.disabled = true))
		facade.selectShown()

		expect(facade.selected).toEqual([])
		expect(facade.shownSelection).toBe('empty')
		expect(changed.mock.calls).toEqual([['empty']])

		facade.items[0].disabled = false

		expect(facade.shownSelection).toBe('none')
		expect(changed.mock.calls).toEqual([['empty'], ['none']])
	})

	it('выбранная строка, которую выключили последней, — выбирать нечего, а не «все»', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items

		facade.extensions.selection.select(anna)
		boris.disabled = true
		vera.disabled = true

		expect(facade.shownSelection).toBe('all')

		anna.disabled = true

		expect(facade.shownSelection).toBe('empty')
	})

	it('удалили невыбранную строку — выбраны все', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items

		facade.extensions.selection.select(anna)
		facade.extensions.selection.select(boris)
		facade.extensions.plain.remove(vera)

		expect(facade.shownSelection).toBe('all')
	})

	it('отбор: скрытые строки в счёт не входят, и команды не трогают их выбор', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items
		const filter = new TFilterExtension<ITableRow>()
		const changed = vi.fn()

		facade.engine.use(filter)
		facade.events.on('change:shownSelection', changed)
		facade.extensions.selection.select(boris)

		filter.predicate = (row) => row !== boris

		expect(facade.shownSelection).toBe('none')

		facade.selectShown()

		expect(facade.selected).toEqual([boris, anna, vera])
		expect(facade.shownSelection).toBe('all')

		facade.deselectShown()

		expect(facade.selected).toEqual([boris])

		filter.predicate = undefined

		expect(facade.shownSelection).toBe('some')
		expect(changed.mock.calls).toEqual([['some'], ['none'], ['all'], ['none'], ['some']])
	})

	it('отменённый выбор строки: остальные выбраны, счёт — часть', () => {
		const facade = table('multiple')
		const [anna, boris, vera] = facade.items

		facade.extensions.selection.events.on('item:select:before', (e) => {
			if (e.item === boris) e.preventDefault()
		})
		facade.selectShown()

		expect(facade.selected).toEqual([anna, vera])
		expect(facade.shownSelection).toBe('some')
	})

	it('single: выбрать все нельзя, снять — можно', () => {
		const facade = table('single')
		const boris = rowOf(facade.items, 2)

		facade.selectShown()

		expect(facade.selected).toEqual([])

		facade.extensions.selection.select(boris)
		facade.deselectShown()

		expect(facade.selected).toEqual([])
	})

	it('выключенная таблица: строки выключены, выбрать их нельзя', () => {
		const owner = new TTable({ disabled: true })
		const facade = new TTableCollectionFacade(
			{ items: [ANNA, BORIS].map(source), mode: 'multiple' },
			{ owner },
		)

		facade.selectShown()

		expect(facade.selected).toEqual([])
		expect(facade.shownSelection).toBe('empty')

		owner.disabled = false
		facade.selectShown()

		expect(facade.shownSelection).toBe('all')
	})

	it('пустая таблица — выбирать нечего', () => {
		const facade = new TTableCollectionFacade({ mode: 'multiple' })

		facade.selectShown()

		expect(facade.shownSelection).toBe('empty')
	})

	// Пачкой, а не по строке: поштучный выбор слал change:selection на каждую
	// строку, и каждый подписчик проходил все строки — время росло квадратично
	it('команды шапки на 1000 строк — по одному change:selection и change:shownSelection', () => {
		const records = Array.from({ length: 1000 }, (_, index) => ({ id: index + 1 }))
		const facade = new TTableCollectionFacade({ items: records.map(source), mode: 'multiple' })
		const selection = vi.fn()
		const shownSelection = vi.fn()

		facade.extensions.selection.events.on('change:selection', selection)
		facade.events.on('change:shownSelection', shownSelection)

		facade.selectShown()

		expect(facade.selected).toHaveLength(1000)
		expect(selection).toHaveBeenCalledOnce()
		expect(shownSelection.mock.calls).toEqual([['all']])

		facade.deselectShown()

		expect(facade.selected).toEqual([])
		expect(selection).toHaveBeenCalledTimes(2)
		expect(shownSelection.mock.calls).toEqual([['all'], ['none']])
	})

	it('команды шапки читают показанные строки из памяти выборки', () => {
		const facade = table('multiple')
		const queries = vi.fn()

		void facade.shown
		facade.engine.getCore().driver.events.on('items:query:before', queries)

		facade.selectShown()
		facade.deselectShown()

		expect(queries).not.toHaveBeenCalled()
	})
})

describe('движок снаружи', () => {
	it('переносит строки, колонки и их порядок; владельца пишет приём компонента', () => {
		const engine = rows([ANNA, BORIS], [NAME, AGE])
		const { columns } = engine.extensions

		columns.engine.extensions.plain.move(columnOf(columns.columns, 'age'), 0)

		const owner = new TTable()
		const facade = new TTableCollectionFacade({}, { engine, owner })
		const anna = rowOf(facade.items, 1)

		expect(facade.engine).toBe(engine)
		expect(facade.items).toEqual(engine.extensions.batch.items)
		expect(fields(facade.shownColumns)).toEqual(['age', 'name'])
		expect(facadeOf(facade.engine, anna).cells.map((cell) => cell.value)).toEqual([30, 'Анна'])

		expect(engine.options.get('owner')).toBeUndefined()

		facade.bindOwner()
		owner.disabled = true

		expect(engine.options.get('owner')).toBe(owner)
		expect(facade.items.every((row) => row.disabled)).toBe(true)
	})

	it('движок уровня 1: фасад доставит строки, выбор и колонки', () => {
		const engine = createEngine<ITableRow>({ items: [source(ANNA)] })
		const facade = new TTableCollectionFacade({ columns: [NAME], mode: 'multiple' }, { engine })
		const [anna] = facade.items

		expect(anna).toBeInstanceOf(TTableRow)
		expect(anna.data).toBe(ANNA)
		expect(facade.mode).toBe('multiple')
		expect(fields(facade.columns)).toEqual(['name'])

		// Колонки легли в движок строк: второй компонент над ним видит те же
		const again = new TTableCollectionFacade({}, { engine })

		expect(again.columns).toHaveLength(1)
		expect(again.columns[0]).toBe(facade.columns[0])
	})
})

describe('фасад коллекции строк', () => {
	it('колонки пропом; пустой состав колонок движок снаружи не очищает', () => {
		const engine = rows([ANNA], [NAME, AGE])
		const facade = new TTableCollectionFacade({ columns: [] }, { engine })

		expect(fields(facade.columns)).toEqual(['name', 'age'])

		facade.columns = [ID]

		expect(fields(facade.columns)).toEqual(['id'])
		expect(fields(engine.extensions.columns.columns)).toEqual(['id'])
	})

	// Снятый из разметки проп связка возвращает к умолчанию — колонок нет, как
	// у сортировки: снятая сортировка — порядок данных
	it('колонки не заданы — колонок нет', () => {
		const facade = table('multiple')

		facade.columns = undefined

		expect(facade.columns).toEqual([])
		expect(facade.shownColumns).toEqual([])
	})

	it('события колонок и выбора показанных доходят до фасада', () => {
		const facade = table('multiple')
		const shown = vi.fn()
		const cells = vi.fn()
		const selection = vi.fn()

		facade.events.on('change:shownColumns', shown)
		facade.events.on('change:cells', cells)
		facade.events.on('change:shownSelection', selection)

		facade.columns = [NAME]
		facade.selectShown()

		expect(shown).toHaveBeenCalledOnce()
		expect(cells).toHaveBeenCalledOnce()
		expect(selection).toHaveBeenCalledWith('all')
	})
})

/**
 * Ширину, которую пользователь задал ручкой, таблица отдаёт наружу одним
 * событием на действие, — по нему приложение её сохраняет. Как ручка считает
 * ширину, — `table-columns.spec.ts`, «ручка ширины».
 */
/**
 * Порядок, в который пользователь переставил колонки, таблица отдаёт наружу
 * одним событием на действие — по нему приложение его сохраняет. Как
 * переставляет расширение, — `table-columns.spec.ts`, «перестановка колонок».
 */
describe('порядок колонок от пользователя', () => {
	const MOVABLE: readonly TTableColumnSource[] = [
		{ ...NAME, reorderable: true },
		{ ...AGE, reorderable: true },
	]

	it('column:move — у фасада, одно на действие, с порядком полей', () => {
		const facade = new TTableCollectionFacade({ columns: [...MOVABLE] })
		const move = vi.fn()
		const age = columnOf(facade.columns, 'age')
		const { columns } = facade.extensions

		facade.events.on('column:move', move)

		columns.dragStart(age)
		columns.dragOver(0)

		expect(move).not.toHaveBeenCalled()

		columns.dragEnd()

		expect(move.mock.calls).toEqual([[{ column: age, order: ['age', 'name'] }]])
		expect(facade.shownColumns.map((column) => column.field)).toEqual(['age', 'name'])
	})

	it('выключенная таблица колонку не переставляет', () => {
		const owner = new TTable({ disabled: true })
		const facade = new TTableCollectionFacade({ columns: [...MOVABLE] }, { owner })
		const move = vi.fn()

		facade.events.on('column:move', move)

		expect(facade.extensions.columns.moveColumn(columnOf(facade.columns, 'age'), 0)).toBe(false)
		expect(facade.extensions.columns.dragStart(columnOf(facade.columns, 'age'))).toBe(false)
		expect(move).not.toHaveBeenCalled()
	})
})

describe('ширина колонки от пользователя', () => {
	const RESIZABLE: readonly TTableColumnSource[] = [
		{ ...NAME, resizable: true, width: 150 },
		{ ...AGE, resizable: true, width: 100 },
	]

	it('column:resize — у фасада на законченную правку показанной колонки, одно на действие', () => {
		const facade = new TTableCollectionFacade({ columns: [...RESIZABLE] })
		const resize = vi.fn()
		const name = columnOf(facade.columns, 'name')

		facade.events.on('column:resize', resize)

		name.grab(150)
		name.drag(10)
		name.drag(30)

		expect(resize).not.toHaveBeenCalled()

		name.release()
		columnOf(facade.columns, 'age').shift(-20)

		expect(resize.mock.calls).toEqual([
			[{ column: name, width: 180 }],
			[{ column: columnOf(facade.columns, 'age'), width: 80 }],
		])
	})

	it('скрытую колонку таблица не слушает, показанную снова — одной подпиской', () => {
		const engine = rows([ANNA], [...RESIZABLE])
		const name = columnOf(engine.extensions.columns.columns, 'name')
		const resize = vi.fn()

		engine.extensions.columns.events.on('column:resize', resize)

		name.visible = false
		name.shift(10)

		expect(resize).not.toHaveBeenCalled()

		name.visible = true
		name.shift(10)

		expect(resize.mock.calls).toEqual([[{ column: name, width: 170 }]])
	})

	it('удалённую колонку таблица больше не слушает', () => {
		const engine = rows([ANNA], [...RESIZABLE])
		const name = columnOf(engine.extensions.columns.columns, 'name')
		const resize = vi.fn()

		engine.extensions.columns.events.on('column:resize', resize)
		engine.extensions.columns.columns = [AGE]
		name.shift(10)

		expect(resize).not.toHaveBeenCalled()
	})

	it('выключенная таблица выключает колонки: пришедшие, все на смену и поверх патча', () => {
		const owner = new TTable({ disabled: true })
		const facade = new TTableCollectionFacade({ columns: [...RESIZABLE] }, { owner })
		const states = () => facade.columns.map((column) => column.disabled)

		expect(states()).toEqual([true, true])

		owner.disabled = false

		expect(states()).toEqual([false, false])

		owner.disabled = true
		facade.columns = [{ ...NAME, disabled: false }, { ...AGE }, ID]

		expect(states()).toEqual([true, true, true])
		expect(facade.columns.every((column) => !column.resizerRendered)).toBe(true)
	})

	it('включённая таблица своё «выключено» колонки из данных не трогает', () => {
		const facade = new TTableCollectionFacade(
			{ columns: [{ ...NAME, disabled: true }, AGE] },
			{ owner: new TTable() },
		)

		expect(facade.columns.map((column) => column.disabled)).toEqual([true, false])
	})

	it('таблица пришла после колонок — догон', () => {
		const engine = rows([ANNA], [...RESIZABLE])
		const owner = new TTable({ disabled: true })

		engine.options.set({ owner })

		expect(engine.extensions.columns.columns.every((column) => column.disabled)).toBe(true)
	})
})

describe('выбор строк включён — колонка выбора', () => {
	it('selecting — режим не none; событие только на смену признака', () => {
		const facade = table('none')
		const selecting = vi.fn()

		facade.events.on('change:selecting', selecting)

		expect(facade.extensions.table.selecting).toBe(false)

		facade.mode = 'single'
		facade.mode = 'multiple'

		expect(facade.extensions.table.selecting).toBe(true)

		facade.mode = 'none'

		expect(facade.extensions.table.selecting).toBe(false)
		expect(selecting.mock.calls).toEqual([[true], [false]])
	})

	it('строка знает, включён ли выбор: признак и событие фасада строки', () => {
		const facade = table('none')
		const row = facadeOf(facade.engine, rowOf(facade.items, 1))
		const selecting = vi.fn()

		row.events.on('change:selecting', selecting)

		expect(row.selecting).toBe(false)

		facade.mode = 'multiple'

		expect(row.selecting).toBe(true)
		expect(selecting).toHaveBeenCalledOnce()
		expect(new TTableRowCollectionFacade().selecting).toBe(false)
	})

	it('число колонок строки — показанные и колонка выбора, не меньше одной', () => {
		const facade = table('none')

		expect(facade.columnCount).toBe(2)

		facade.mode = 'single'

		expect(facade.columnCount).toBe(3)

		columnOf(facade.columns, 'age').hide()

		expect(facade.columnCount).toBe(2)

		facade.columns = []
		facade.mode = 'none'

		expect(facade.columnCount).toBe(1)
	})
})

describe('чекбокс «выбрать все»', () => {
	it('вид счёта показанных: ни одной, часть, все, выбирать нечего', () => {
		const facade = table('multiple')
		const { selectAll } = facade
		const [anna, boris, vera] = facade.items
		const { selection } = facade.extensions

		expect([selectAll.value, selectAll.indeterminate, selectAll.disabled]).toEqual([
			false,
			false,
			false,
		])

		selection.select(anna)

		expect([selectAll.value, selectAll.indeterminate]).toEqual([false, true])

		selection.select(boris)
		selection.select(vera)

		expect([selectAll.value, selectAll.indeterminate]).toEqual([true, false])

		facade.items.forEach((row) => (row.disabled = true))

		expect([selectAll.value, selectAll.indeterminate, selectAll.disabled]).toEqual([
			false,
			false,
			true,
		])
	})

	it('отметка — просьба выбрать все показанные, снятая — снять с них выбор', () => {
		const facade = table('multiple')
		const { selectAll } = facade

		selectAll.value = true

		expect(facade.selected).toEqual([...facade.items])
		expect(selectAll.value).toBe(true)

		selectAll.toggle()

		expect(facade.selected).toEqual([])
		expect(selectAll.value).toBe(false)
	})

	it('из «части» — выбрать все: так его переключает клик', () => {
		const facade = table('multiple')
		const { selectAll } = facade

		facade.extensions.selection.select(facade.items[0])
		selectAll.toggle()

		expect(facade.shownSelection).toBe('all')
		expect([selectAll.value, selectAll.indeterminate]).toEqual([true, false])
	})

	it('отменённый выбор: отметка остаётся видом выбора', () => {
		const facade = table('multiple')
		const { selectAll } = facade
		const changed = vi.fn()

		facade.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())
		selectAll.events.on('change:value', changed)
		selectAll.toggle()

		expect(facade.selected).toEqual([])
		expect([selectAll.value, selectAll.indeterminate]).toEqual([false, false])
		expect(changed).not.toHaveBeenCalled()
	})

	it('отменён выбор части строк — «часть», хоть чекбокс и просили отметить', () => {
		const facade = table('multiple')
		const { selectAll } = facade
		const anna = rowOf(facade.items, 1)

		facade.extensions.selection.events.on('item:select:before', (e) => {
			if (e.item !== anna) e.preventDefault()
		})
		selectAll.toggle()

		expect(facade.selected).toEqual([anna])
		expect([selectAll.value, selectAll.indeterminate]).toEqual([false, true])
	})

	it('из «части» с отменённым выбором — «часть» возвращается', () => {
		const facade = table('multiple')
		const { selectAll } = facade
		const [anna] = facade.items

		facade.extensions.selection.select(anna)
		facade.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())
		selectAll.toggle()

		expect(facade.selected).toEqual([anna])
		expect([selectAll.value, selectAll.indeterminate]).toEqual([false, true])
	})

	it('у выключенной таблицы выключен; размер и вариант — таблицы', () => {
		const owner = new TTable({ disabled: true, size: 'lg' })
		const facade = new TTableCollectionFacade(
			{ items: [ANNA, BORIS].map(source), mode: 'multiple' },
			{ owner },
		)
		const { selectAll } = facade

		expect(selectAll.disabled).toBe(true)
		expect(selectAll.size).toBe('lg')

		owner.disabled = false
		owner.size = 'sm'

		expect(selectAll.disabled).toBe(false)
		expect(selectAll.size).toBe('sm')
	})

	it('один на таблицу: тот же экземпляр у фасада и у расширения', () => {
		const facade = table('multiple')

		expect(facade.selectAll).toBe(facade.extensions.table.selectAll)
		expect(facade.selectAll).toBe(facade.selectAll)
	})
})

describe('чекбокс строки', () => {
	it('вид выбора строки — и когда выбор пришёл не от него', () => {
		const facade = table('multiple')
		const anna = rowOf(facade.items, 1)
		const checkBox = facade.extensions.table.checkBoxOf(anna)

		expect(checkBox.value).toBe(false)

		facade.selectShown()

		expect(checkBox.value).toBe(true)

		facade.extensions.selection.deselect(anna)

		expect(checkBox.value).toBe(false)
	})

	it('отметка — просьба выбрать строку, снятая — снять выбор', () => {
		const facade = table('multiple')
		const anna = rowOf(facade.items, 1)
		const checkBox = facade.extensions.table.checkBoxOf(anna)

		checkBox.toggle()

		expect(facade.selected).toEqual([anna])
		expect(checkBox.value).toBe(true)

		checkBox.toggle()

		expect(facade.selected).toEqual([])
		expect(checkBox.value).toBe(false)
	})

	it('single: выбор строки снимает отметку с другой', () => {
		const facade = table('single')
		const { table: extension } = facade.extensions
		const anna = extension.checkBoxOf(rowOf(facade.items, 1))
		const boris = extension.checkBoxOf(rowOf(facade.items, 2))

		anna.toggle()
		boris.toggle()

		expect(facade.selected).toEqual([rowOf(facade.items, 2)])
		expect([anna.value, boris.value]).toEqual([false, true])
	})

	it('отменённый выбор: строка не выбрана, и чекбокс не отмечен', () => {
		const facade = table('multiple')
		const anna = rowOf(facade.items, 1)
		const checkBox = facade.extensions.table.checkBoxOf(anna)
		const changed = vi.fn()

		facade.extensions.selection.events.on('item:select:before', (e) => e.preventDefault())
		checkBox.events.on('change:value', changed)
		checkBox.toggle()

		expect(facade.selected).toEqual([])
		expect(checkBox.value).toBe(false)
		expect(changed).not.toHaveBeenCalled()
	})

	it('выключенная строка: чекбокс выключен, и просьба её не выбирает', () => {
		const facade = table('multiple')
		const anna = rowOf(facade.items, 1)
		const checkBox = facade.extensions.table.checkBoxOf(anna)

		anna.disabled = true

		expect(checkBox.disabled).toBe(true)

		checkBox.value = true

		expect(facade.selected).toEqual([])
		expect(checkBox.value).toBe(false)

		anna.disabled = false

		expect(checkBox.disabled).toBe(false)
	})

	it('один на строку, пока она в коллекции; размер и вариант — таблицы', () => {
		const owner = new TTable({ size: 'lg' })
		const facade = new TTableCollectionFacade(
			{
				items: [ANNA, BORIS].map(source),
				trackBy: (row) => idOf(row.data),
				mode: 'multiple',
			},
			{ owner },
		)
		const anna = rowOf(facade.items, 1)
		const checkBox = facade.extensions.table.checkBoxOf(anna)

		expect(facade.extensions.table.checkBoxOf(anna)).toBe(checkBox)
		expect(checkBox.size).toBe('lg')

		owner.size = 'sm'

		expect(checkBox.size).toBe('sm')

		facade.extensions.plain.remove(anna)
		facade.extensions.plain.push(anna)

		expect(facade.extensions.table.checkBoxOf(anna)).not.toBe(checkBox)
	})

	it('чекбокс строки отдаёт item-адаптер таблицы — тот же, что у расширения', () => {
		const facade = table('multiple')
		const anna = rowOf(facade.items, 1)
		const context = new TItemContext(anna, facade.engine.getCore().extensions)

		expect(context.adapters.table.checkBox).toBe(facade.extensions.table.checkBoxOf(anna))
	})
})

describe('заголовок строки', () => {
	/** Строка Анны с колонками и id заголовка, как его пишет плагин связок. */
	function header(columns: readonly TTableColumnSource[]) {
		const engine = rows([ANNA], columns)
		const anna = rowOf(engine.extensions.batch.items, 1)

		anna.headerAria.add('id', 'anna-header')

		return { engine, anna, facade: facadeOf(engine, anna), columns: engine.extensions.columns }
	}

	it('ячейка колонки rowHeader — заголовок; набор заголовка строки — на ней', () => {
		const { facade } = header([{ ...NAME, rowHeader: true }, AGE])

		expect(facade.cells.map((cell) => cell.rowHeader)).toEqual([true, false])
		expect(facade.cells.map((cell) => cell.aria)).toEqual([{ id: 'anna-header' }, {}])
		expect(facade.rowHeaderId).toBe('anna-header')
	})

	it('колонок заголовка две — заголовки обе, набор с id — только у первой показанной', () => {
		const { facade, columns } = header([
			ID,
			{ ...NAME, rowHeader: true },
			{ ...AGE, rowHeader: true },
		])

		expect(facade.cells.map((cell) => cell.rowHeader)).toEqual([false, true, true])
		expect(facade.cells.map((cell) => cell.aria)).toEqual([{}, { id: 'anna-header' }, {}])

		columnOf(columns.columns, 'name').hide()

		expect(facade.cells.map((cell) => cell.aria)).toEqual([{}, { id: 'anna-header' }])
	})

	it('без колонки заголовка ссылки нет; скрытая — тоже', () => {
		const plain = header([NAME, AGE])

		expect(plain.facade.rowHeaderId).toBeUndefined()
		expect(plain.facade.cells.every((cell) => !cell.rowHeader)).toBe(true)

		const hidden = header([{ ...NAME, rowHeader: true }, AGE])

		columnOf(hidden.columns.columns, 'name').hide()

		expect(hidden.facade.rowHeaderId).toBeUndefined()
	})

	it('признак заголовка и набор заголовка — событие ячеек', () => {
		const { anna, facade, columns } = header([NAME, AGE])
		const cells = watchCells(facade)

		columnOf(columns.columns, 'name').rowHeader = true

		expect(cells).toHaveBeenCalledOnce()
		expect(facade.rowHeaderId).toBe('anna-header')

		anna.headerAria.add('id', 'anna-header-2')

		expect(cells).toHaveBeenCalledTimes(2)
		expect(facade.rowHeaderId).toBe('anna-header-2')

		// Признак скрытой колонки ячеек не трогает
		const age = columnOf(columns.columns, 'age')

		age.hide()
		cells.mockClear()
		age.rowHeader = true

		expect(cells).not.toHaveBeenCalled()
	})

	it('у строки набор заголовка свой и сообщает о смене', () => {
		const row = new TTableRow({ data: ANNA })
		const changed = vi.fn()

		row.events.on('change:headerAria', changed)
		row.headerAria.add('id', 'x')
		row.headerAria.add('id', 'x')

		expect(row.headerAria.toObject()).toEqual({ id: 'x' })
		expect(changed.mock.calls).toEqual([[{ id: 'x' }]])
	})
})
