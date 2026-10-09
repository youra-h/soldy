import { describe, it, expect, vi } from 'vitest'
import {
	TItemContext,
	TTable,
	TTableCollectionFacade,
	TTableRowCollectionFacade,
	createEngineTable,
} from '@soldy-ui/core'
import type {
	ITableColumn,
	ITableRow,
	TSelectionMode,
	TTableCollection,
	TTableColumnSource,
	TTableGridCell,
	TTableRecord,
} from '@soldy-ui/core'

/**
 * Сетка — режим таблицы по паттерну APG Data Grid, расширение `grid`
 * коллекции строк.
 *
 * Фокус — ячейка, пара «строка × колонка»: строки сетки — шапка и показанные
 * строки, колонки — колонка выбора и показанные колонки. Остановка Tab у сетки
 * одна — сама таблица, ячейки фокус только принимают: переход фокуса не
 * трогает ни одной строки. Как DOM-фокус идёт за фокусом сетки и какие клавиши
 * его двигают, — `plugins/__tests__/table-grid.plugin.spec.ts`.
 */

const ANNA = { id: 1, name: 'Анна', age: 30 }
const BORIS = { id: 2, name: 'Борис', age: 41 }
const VERA = { id: 3, name: 'Вера', age: 25 }

const NAME: TTableColumnSource = { field: 'name', text: 'Имя' }
const AGE: TTableColumnSource = { field: 'age', text: 'Возраст', sortable: true }
const ID: TTableColumnSource = { field: 'id', text: '№' }

/** Ключ записи — её `id`. */
function idOf(data: TTableRecord | undefined): unknown {
	return data && 'id' in data ? data.id : undefined
}

/** Таблица в сетке над тремя записями и движок её строк. */
function grid(mode: TSelectionMode = 'none', columns: readonly TTableColumnSource[] = [NAME, AGE]) {
	const owner = new TTable()
	const facade = new TTableCollectionFacade(
		{
			items: [ANNA, BORIS, VERA].map((data) => ({ data })),
			trackBy: (row) => idOf(row.data),
			columns: [...columns],
			mode,
			grid: true,
		},
		{ owner },
	)
	const engine: TTableCollection = facade.engine

	const [anna, boris, vera] = engine.extensions.batch.items
	const [name, age] = engine.extensions.columns.columns

	return { owner, facade, engine, anna, boris, vera, name, age, grid: engine.extensions.grid }
}

/** Ячейка, как её назвал бы тест. */
const cell = (row: ITableRow | 'head', column: ITableColumn | 'select'): TTableGridCell => ({
	row,
	column,
})

/** Фасад строки — так набор её ячеек видит разметка. */
function rowFacade(engine: TTableCollection, row: ITableRow): TTableRowCollectionFacade {
	const facade = new TTableRowCollectionFacade()

	facade.setContext(new TItemContext(row, engine.getCore().extensions))

	return facade
}

describe('режим', () => {
	it('по умолчанию — простая таблица: ни роли, ни остановки, ни наборов сетки', () => {
		const owner = new TTable()
		const facade = new TTableCollectionFacade(
			{ items: [{ data: ANNA }], columns: [NAME], mode: 'multiple' },
			{ owner },
		)
		const [anna] = facade.engine.extensions.batch.items
		const [name] = facade.columns

		expect(facade.grid).toBe(false)
		expect(owner.aria.has('role')).toBe(false)
		expect(owner.aria.has('tabindex')).toBe(false)
		expect(owner.aria.has('aria-multiselectable')).toBe(false)
		expect(owner.dataset.get('grid')).toBe('false')
		expect(facade.cellAria).toEqual({})
		expect(name.aria.has('tabindex')).toBe(false)
		expect(anna.aria.has('aria-selected')).toBe(false)
	})

	it('сетка: роль grid, остановка Tab — сама таблица, ячейки и заголовки фокус только принимают', () => {
		const { owner, facade, name, age } = grid()

		expect(owner.aria.get('role')).toBe('grid')
		expect(owner.aria.get('tabindex')).toBe('0')
		expect(owner.dataset.get('grid')).toBe('true')
		expect(facade.cellAria).toEqual({ tabindex: '-1' })
		expect(name.aria.get('tabindex')).toBe('-1')
		expect(age.aria.get('tabindex')).toBe('-1')
	})

	it('выключили сетку — наборы сняты; change:grid и change:cellAria — на смену', () => {
		const { owner, facade, name } = grid()
		const changed = vi.fn()
		const cellAria = vi.fn()

		facade.events.on('change:grid', changed)
		facade.events.on('change:cellAria', cellAria)

		facade.grid = false
		facade.grid = false

		expect(changed.mock.calls).toEqual([[false]])
		expect(cellAria.mock.calls).toEqual([[{}]])
		expect(owner.aria.has('role')).toBe(false)
		expect(owner.aria.has('tabindex')).toBe(false)
		expect(owner.dataset.get('grid')).toBe('false')
		expect(name.aria.has('tabindex')).toBe(false)
	})

	it('пришедшая колонка в сетке принимает фокус', () => {
		const { engine } = grid()

		engine.extensions.columns.columns = [NAME, AGE, ID]

		const id = engine.extensions.columns.columns[2]

		expect(id.aria.get('tabindex')).toBe('-1')
	})

	it('выключенная таблица — сетка без остановки Tab и без фокуса ячеек', () => {
		const { owner, facade, name, grid: ext } = grid()
		const before = ext.focusedCell

		owner.disabled = true

		expect(owner.aria.get('role')).toBe('grid')
		expect(owner.aria.has('tabindex')).toBe(false)
		expect(facade.cellAria).toEqual({})
		expect(name.aria.has('tabindex')).toBe(false)

		ext.moveFocus(1, 1)

		expect(ext.focusedCell).toBe(before)

		owner.disabled = false

		expect(owner.aria.get('tabindex')).toBe('0')
		expect(facade.cellAria).toEqual({ tabindex: '-1' })
	})

	it('aria-multiselectable — только в multiple', () => {
		const { owner, engine } = grid('single')

		expect(owner.aria.has('aria-multiselectable')).toBe(false)

		engine.extensions.selection.mode = 'multiple'

		expect(owner.aria.get('aria-multiselectable')).toBe('true')
	})

	it('набор ячеек строки — у фасада строки, на смену — change:cellAria', () => {
		const { engine, facade, anna } = grid()
		const row = rowFacade(engine, anna)
		const changed = vi.fn()

		row.events.on('change:cellAria', changed)

		expect(row.cellAria).toEqual({ tabindex: '-1' })

		facade.grid = false

		expect(row.cellAria).toEqual({})
		expect(changed).toHaveBeenCalledTimes(1)
	})
})

describe('фокус ячейки', () => {
	it('с начала — первая ячейка шапки; выбор включили — фокус остаётся на своей ячейке', () => {
		const { engine, grid: ext, name } = grid()

		expect(ext.focusedCell).toEqual(cell('head', name))

		engine.extensions.selection.mode = 'multiple'

		expect(ext.gridColumns[0]).toBe('select')
		expect(ext.focusedCell).toEqual(cell('head', name))
	})

	it('строки сетки — шапка и показанные строки, колонки — колонка выбора и показанные', () => {
		const { grid: ext, anna, boris, vera, name, age } = grid('single')

		expect(ext.gridRows).toEqual(['head', anna, boris, vera])
		expect(ext.gridColumns).toEqual(['select', name, age])
	})

	it('сдвиг — по строкам и колонкам; за краем — край, по кругу не ходит', () => {
		const { grid: ext, anna, vera, name, age } = grid()
		const changed = vi.fn()

		ext.events.on('change:focusedCell', changed)

		ext.moveFocus(1, 1)

		expect(ext.focusedCell).toEqual(cell(anna, age))

		ext.moveFocus(10, 10)

		expect(ext.focusedCell).toEqual(cell(vera, age))

		ext.moveFocus(-10, -10)

		expect(ext.focusedCell).toEqual(cell('head', name))
		expect(changed).toHaveBeenCalledTimes(3)

		// Упёрлись в край — ячейка та же, события нет
		ext.moveFocus(-1, 0)

		expect(changed).toHaveBeenCalledTimes(3)
	})

	it('края строки и сетки', () => {
		const { grid: ext, boris, vera, name, age } = grid('multiple')

		ext.focusCell(boris, name)
		ext.moveFocusToEdge('end', 'row')

		expect(ext.focusedCell).toEqual(cell(boris, age))

		ext.moveFocusToEdge('start', 'row')

		expect(ext.focusedCell).toEqual(cell(boris, 'select'))

		ext.moveFocusToEdge('end', 'grid')

		expect(ext.focusedCell).toEqual(cell(vera, age))

		ext.moveFocusToEdge('start', 'grid')

		expect(ext.focusedCell).toEqual(cell('head', 'select'))
	})

	it('focusCell — только на ячейку сетки и только в сетке', () => {
		const { facade, grid: ext, boris, name } = grid()
		const before = ext.focusedCell

		ext.focusCell(boris, 'select')

		expect(ext.focusedCell).toBe(before)

		facade.grid = false
		ext.focusCell(boris, name)

		expect(ext.focusedCell).toBe(before)
	})

	it('строки отсортировали — фокус остаётся на своей строке', () => {
		const { engine, grid: ext, anna, age } = grid()
		const changed = vi.fn()

		ext.focusCell(anna, age)
		ext.events.on('change:focusedCell', changed)
		engine.extensions.sort.sort = [{ field: 'age', direction: 'desc' }]

		expect(ext.gridRows.indexOf(anna)).toBe(2)
		expect(ext.focusedCell).toEqual(cell(anna, age))
		expect(changed).not.toHaveBeenCalled()
	})

	it('строку под фокусом убрали — фокус на ячейке того же места, у края — на крайней', () => {
		const { engine, grid: ext, boris, vera, age } = grid()

		ext.focusCell(boris, age)
		engine.extensions.batch.items = [{ data: ANNA }, { data: VERA }]

		expect(ext.focusedCell).toEqual(cell(vera, age))

		engine.extensions.batch.items = [{ data: ANNA }]

		expect(ext.focusedCell?.row).toBe(engine.extensions.batch.items[0])
	})

	it('колонку под фокусом скрыли — фокус на ячейке того же места', () => {
		const { engine, grid: ext, anna, name, age } = grid('none', [NAME, AGE, ID])
		const id = engine.extensions.columns.columns[2]

		ext.focusCell(anna, age)
		age.visible = false

		expect(ext.focusedCell).toEqual(cell(anna, id))

		id.visible = false

		expect(ext.focusedCell).toEqual(cell(anna, name))
	})

	it('выбор выключили — колонки выбора нет, фокус с неё уходит на ячейку того же места', () => {
		const { engine, grid: ext, boris, name } = grid('single')

		ext.focusCell(boris, 'select')
		engine.extensions.selection.mode = 'none'

		expect(ext.focusedCell).toEqual(cell(boris, name))
	})

	it('колонок нет — ячеек нет', () => {
		const { engine, grid: ext } = grid()

		engine.extensions.columns.columns = []

		expect(ext.focusedCell).toBeUndefined()

		engine.extensions.columns.columns = [NAME]

		expect(ext.focusedCell).toEqual(cell('head', engine.extensions.columns.columns[0]))
	})
})

describe('выбор строки', () => {
	it('в multiple — переключить, в single — как строку ListBox', () => {
		const multiple = grid('multiple')

		expect(multiple.grid.chooseRow(multiple.anna)).toBe(true)
		expect(multiple.grid.chooseRow(multiple.boris)).toBe(true)
		expect(multiple.engine.extensions.selection.selected).toEqual([
			multiple.anna,
			multiple.boris,
		])

		multiple.grid.chooseRow(multiple.anna)

		expect(multiple.engine.extensions.selection.selected).toEqual([multiple.boris])

		const single = grid('single')

		single.grid.chooseRow(single.anna)
		single.grid.chooseRow(single.boris)

		expect(single.engine.extensions.selection.selected).toEqual([single.boris])
	})

	it('отказ: вне сетки, без выбора строк, выключенная строка', () => {
		const { facade, engine, grid: ext, anna, boris } = grid('multiple')

		boris.disabled = true

		expect(ext.chooseRow(boris)).toBe(false)

		facade.grid = false

		expect(ext.chooseRow(anna)).toBe(false)

		facade.grid = true
		engine.extensions.selection.mode = 'none'

		expect(ext.chooseRow(anna)).toBe(false)
		expect(engine.extensions.selection.selected).toEqual([])
	})

	it('aria-selected — на всех строках сетки с выбором и идёт за выбором', () => {
		const { engine, grid: ext, anna, boris } = grid('multiple')

		expect(anna.aria.get('aria-selected')).toBe('false')

		ext.chooseRow(anna)

		expect(anna.aria.get('aria-selected')).toBe('true')
		expect(boris.aria.get('aria-selected')).toBe('false')

		engine.extensions.batch.items = [...engine.extensions.batch.items, { data: { id: 4 } }]

		expect(engine.extensions.batch.items[3].aria.get('aria-selected')).toBe('false')

		engine.extensions.selection.mode = 'none'

		expect(anna.aria.has('aria-selected')).toBe(false)
	})

	// В сетке выбор пишет строке ещё и `aria-selected`, но ячейки и их набор те
	// же: разметке нечего перечитывать, и «выбрать все» не перерисовывает
	// ячейки строк
	it('выбор строки, «выбрать все» и снятие выбора — ни ячеек, ни их набора', () => {
		const columns = [{ ...NAME, rowHeader: true }, AGE]
		const { engine, facade, grid: ext, anna } = grid('multiple', columns)
		const rows = engine.extensions.batch.items.map((row) => rowFacade(engine, row))
		const cells = vi.fn()
		const cellAria = vi.fn()

		for (const row of rows) {
			row.events.on('change:cells', cells)
			row.events.on('change:cellAria', cellAria)
		}

		ext.chooseRow(anna)

		expect(anna.aria.get('aria-selected')).toBe('true')

		facade.selectShown()

		expect(engine.extensions.selection.selected).toHaveLength(3)

		facade.deselectShown()

		expect(engine.extensions.selection.selected).toEqual([])
		expect(cells).not.toHaveBeenCalled()
		expect(cellAria).not.toHaveBeenCalled()
	})

	it('без сетки aria-selected нет и у выбранной строки', () => {
		const owner = new TTable()
		const engine = createEngineTable({ owner, items: [{ data: ANNA }] })

		engine.extensions.selection.mode = 'multiple'
		engine.extensions.selection.select(engine.extensions.batch.items[0])

		expect(engine.extensions.batch.items[0].aria.has('aria-selected')).toBe(false)
	})
})
