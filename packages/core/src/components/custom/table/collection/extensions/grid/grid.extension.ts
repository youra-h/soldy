import { TBaseOwnerItemExtension } from '../../../../../base/collection'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtensionContext,
} from '../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../common'
import type { ITableColumn } from '../../../column/types'
import type { ITableRow } from '../../../row/types'
import type { ITable } from '../../../types'
import { batchOf, columnsOf, selectionOf } from '../guards'
import type { TTableEngineOptions } from '../table'
import { TTableGridItemExtension } from './item'
import type {
	ITableGridExtension,
	ITableGridItemExtension,
	TTableGridCell,
	TTableGridColumn,
	TTableGridEdge,
	TTableGridEdgeScope,
	TTableGridEvents,
	TTableGridRow,
} from './types'

/** Набор ячейки сетки: фокус она принимает, но остановкой Tab не бывает. */
const CELL_ARIA: TAriaAttributes = { tabindex: '-1' }

/**
 * Сетка — режим таблицы по паттерну APG Data Grid.
 *
 * Простую таблицу скринридер читает и так, но ходить по ячейкам стрелками и
 * выбирать строку нажатием в ней нельзя — это модель фокуса сетки. Режим —
 * значение коллекции (`grid`), как режим выбора: движок строк, переданный
 * снаружи, несёт его с собой.
 *
 * **Фокус — ячейка**, пара «строка × колонка»: строки сетки — шапка и
 * показанные строки, колонки — колонка выбора, пока выбор включён, и
 * показанные колонки. Ячеек в коллекции нет и не будет — фокус держит
 * расширение, как день с фокусом держит фокус календаря. Ячейку он помнит
 * строкой и колонкой, а не местом: строки отсортировали — фокус остался на
 * своей строке. Строку или колонку под фокусом убрали — фокус встаёт на
 * ячейку того же места, у края — на крайнюю.
 *
 * **Одна остановка Tab — сама таблица** (`tabindex="0"` у корня), а ячейки
 * фокус только принимают (`tabindex="-1"`): у ячеек нет своих остановок, и
 * переход фокуса не перерисовывает ни одной строки, а строк бывают тысячи.
 * Пришедший в таблицу фокус плагин сетки переводит на ячейку под фокусом, и
 * за фокусом расширения DOM-фокус ведёт он же. Где фокус стоит в DOM, ядро не
 * знает.
 *
 * **Что пишет расширение.** Таблице — роль `grid`, остановку Tab,
 * `aria-multiselectable` в `multiple` и `data-grid` для темы; строкам —
 * `aria-selected` на всех, пока выбор строк включён: скринридер объявляет «не
 * выбрана», и для этого нужен атрибут; заголовкам колонок — `tabindex="-1"`;
 * ячейкам — набор `cellAria` (у ячеек нет экземпляра, и набор отдаёт строка).
 * Выключенная таблица — сетка без остановки Tab и без фокуса ячеек, как
 * выключенный календарь.
 *
 * **Выбор строки** — нажатием или пробелом, как строку ListBox
 * (`chooseRow`): переключить. Это выбор пользователя, и выключенную строку он
 * не трогает. Вне сетки строку выбирают только чекбоксом: в роли `table`
 * нажатие по строке ничего не значит.
 *
 * Таблица — опция движка (`owner`): она приходит и уходит после сборки, и
 * расширение её наблюдает. Соседей — состав, выбор и колонки — оно узнаёт по
 * контракту и ставится после них.
 */
export class TTableGridExtension<TOwner extends ITable = ITable, TRow extends ITableRow = ITableRow>
	extends TBaseOwnerItemExtension<
		TRow,
		ITableGridItemExtension<TRow>,
		TTableGridEvents,
		TTableEngineOptions<TOwner>
	>
	implements ITableGridExtension<TRow>
{
	readonly name = 'grid' as const

	private _grid = false

	/** Сетка работает: она включена и таблица не выключена. От него — все наборы. */
	private _active = false

	private _cell: TTableGridCell | undefined = undefined

	/**
	 * Место ячейки под фокусом: строку или колонку убрали — фокус встаёт на то
	 * же место.
	 */
	private _place = { row: 0, column: 0 }

	constructor(options?: IBaseOwnerItemExtensionOptions<TRow, ITableGridItemExtension<TRow>>) {
		super(TTableGridItemExtension, options)
	}

	override install(ctx: IExtensionContext<TRow, TTableEngineOptions<TOwner>>): void {
		super.install(ctx)

		// Пришедшей строке — `aria-selected`, остальным — на смену выбора.
		// Пришедшая ещё не выбрана: отметки из данных выбор ставит в конце
		// записи, и `change:selection` перепишет её следом
		ctx.driver.events.on('item:added', (e) =>
			e.item.aria?.add('aria-selected', this._marksSelection ? 'false' : null),
		)

		const selection = selectionOf(ctx)

		selection?.events.on('change:selection', () => this._applySelectedAll())
		selection?.events.on('change:mode', () => {
			this._applyOwner()
			this._applySelectedAll()
			this._settle()
		})

		// Строки и колонки сетки сменились — фокус остаётся в сетке
		batchOf(ctx)?.events.on('change:shown', () => this._settle())

		const columns = columnsOf(ctx)

		columns?.events.on('change:shownColumns', () => this._settle())
		columns?.engine.extensions.plain.events.on('item:added', (e) => this._applyColumn(e.item))

		// Таблица — опция движка: приходит и уходит после сборки. Подписка на неё
		// живёт в области наблюдателя — сменилась таблица, прежняя снята
		ctx.options.watch('owner', (owner, scope) => {
			this._syncActive()

			if (!owner) return

			this._applyOwner()
			scope.on(owner.events, 'change:disabled', () => this._syncActive())
		})

		this._settle()
	}

	get grid(): boolean {
		return this._grid
	}

	set grid(value: boolean) {
		if (this._grid === value) return

		this._grid = value
		this._syncActive()
		this._applySelectedAll()
		this.events.emit('change:grid', value)
	}

	get focusedCell(): TTableGridCell | undefined {
		return this._cell
	}

	get cellAria(): TAriaAttributes {
		return this._active ? { ...CELL_ARIA } : {}
	}

	get gridRows(): ReadonlyArray<TTableGridRow> {
		return ['head', ...(batchOf(this._ctx)?.shown ?? [])]
	}

	get gridColumns(): ReadonlyArray<TTableGridColumn> {
		const shown = columnsOf(this._ctx)?.shownColumns ?? []

		return this._selecting ? ['select', ...shown] : [...shown]
	}

	focusCell(row: TTableGridRow, column: TTableGridColumn): void {
		if (!this._active) return

		const rowAt = this.gridRows.indexOf(row)
		const columnAt = this.gridColumns.indexOf(column)

		if (rowAt === -1 || columnAt === -1) return

		this._set(row, column, rowAt, columnAt)
	}

	moveFocus(rows: number, columns: number): void {
		const cell = this._cell

		if (!this._active || !cell) return

		const gridRows = this.gridRows
		const gridColumns = this.gridColumns
		const rowAt = within(gridRows.indexOf(cell.row) + rows, gridRows.length)
		const columnAt = within(gridColumns.indexOf(cell.column) + columns, gridColumns.length)

		this._set(gridRows[rowAt], gridColumns[columnAt], rowAt, columnAt)
	}

	moveFocusToEdge(edge: TTableGridEdge, scope: TTableGridEdgeScope): void {
		const cell = this._cell

		if (!this._active || !cell) return

		const gridRows = this.gridRows
		const gridColumns = this.gridColumns
		const columnAt = edge === 'start' ? 0 : gridColumns.length - 1
		const rowAt =
			scope === 'row'
				? gridRows.indexOf(cell.row)
				: edge === 'start'
					? 0
					: gridRows.length - 1

		this._set(gridRows[rowAt], gridColumns[columnAt], rowAt, columnAt)
	}

	chooseRow(row: TRow): boolean {
		const selection = selectionOf(this._ctx)

		if (!this._active || !selection || !this._selecting || row.disabled) return false

		selection.toggle(row)

		return true
	}

	/* ------------------------------------------------------------------ */
	/* Внутреннее                                                         */
	/* ------------------------------------------------------------------ */

	/** Выбор строк включён: у сетки колонка выбора, у строк — `aria-selected`. */
	private get _selecting(): boolean {
		const mode = selectionOf(this._ctx)?.mode

		return mode !== undefined && mode !== 'none'
	}

	/**
	 * Фокус — в сетке: на своей ячейке, а если её строку или колонку убрали —
	 * на ячейке того же места, у края — на крайней. Колонок нет — нет и ячеек.
	 */
	private _settle(): void {
		const gridRows = this.gridRows
		const gridColumns = this.gridColumns

		if (gridColumns.length === 0) {
			this._emitCell(undefined)

			return
		}

		const cell = this._cell
		const rowAt = cell ? gridRows.indexOf(cell.row) : -1
		const columnAt = cell ? gridColumns.indexOf(cell.column) : -1
		const row = rowAt === -1 ? within(this._place.row, gridRows.length) : rowAt
		const column = columnAt === -1 ? within(this._place.column, gridColumns.length) : columnAt

		this._set(gridRows[row], gridColumns[column], row, column)
	}

	private _set(
		row: TTableGridRow,
		column: TTableGridColumn,
		rowAt: number,
		columnAt: number,
	): void {
		this._place = { row: rowAt, column: columnAt }

		if (this._cell?.row === row && this._cell.column === column) return

		this._emitCell({ row, column })
	}

	private _emitCell(cell: TTableGridCell | undefined): void {
		if (this._cell === cell) return

		this._cell = cell
		this.events.emit('change:focusedCell', cell)
	}

	/** Сетка заработала или перестала — наборы таблицы, колонок и ячеек. */
	private _syncActive(): void {
		const active = this._grid && !this._ctx?.options.get('owner')?.disabled

		if (this._active !== active) {
			this._active = active
			this.events.emit('change:cellAria', this.cellAria)
		}

		this._applyOwner()
		columnsOf(this._ctx)?.columns.forEach((column) => this._applyColumn(column))
	}

	/**
	 * Таблице — роль сетки, остановка Tab, `aria-multiselectable` и
	 * `data-grid`. Вне сетки роль даёт тег, и наборы снимаются.
	 */
	private _applyOwner(): void {
		const owner = this._ctx?.options.get('owner')

		if (!owner) return

		const multiple = selectionOf(this._ctx)?.mode === 'multiple'

		owner.dataset.add('grid', this._grid)
		owner.aria.add('role', this._grid ? 'grid' : null)
		owner.aria.add('tabindex', this._active ? '0' : null)
		owner.aria.add('aria-multiselectable', this._grid && multiple ? 'true' : null)
	}

	/** Заголовок колонки в сетке принимает фокус, как ячейка. */
	private _applyColumn(column: Partial<ITableColumn>): void {
		column.aria?.add('tabindex', this._active ? '-1' : null)
	}

	/**
	 * `aria-selected` — на всех строках, пока сетка с выбором: скринридер
	 * объявляет «не выбрана», и для этого нужен атрибут. Вне сетки и без выбора
	 * атрибута нет: в роли `table` выбор строки не объявляется.
	 */
	private get _marksSelection(): boolean {
		return this._grid && this._selecting
	}

	private _applySelectedAll(): void {
		const selection = selectionOf(this._ctx)
		const marks = this._marksSelection

		this._ctx?.driver.valueOf().forEach((row) => {
			const selected = marks && selection ? String(selection.isSelected(row)) : null

			row.aria.add('aria-selected', selected)
		})
	}
}

/** Место в отрезке `[0, length)`. */
function within(value: number, length: number): number {
	return Math.min(Math.max(value, 0), length - 1)
}
