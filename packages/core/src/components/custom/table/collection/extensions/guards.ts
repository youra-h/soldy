import type { IExtension, ISelectionExtension } from '../../../../base/collection'
import type { ITableRow } from '../../row/types'
import type { ITableColumnsExtension } from './columns/types'
import type { ITableGridExtension } from './grid/types'

/** Состав коллекции — общий с остальными коллекциями: его выборка — показанные строки. */
export { batchOf } from '../../../../base/collection/engine/extension/neighbours'

/**
 * Соседи по коллекции строк таблицы.
 *
 * Расширения строк опираются на соседей: ячейки строки — её запись по
 * показанным колонкам, выбор показанных — состав (`batch`) и выбор
 * (`selection`), сортировка — по колонке. Контекст расширения знает соседей
 * только как `IExtension`, поэтому соседа узнают проверкой его контракта, а
 * не приведением типа. Классы соседей не импортируются: так расширения не
 * замыкают друг на друга циклом модулей.
 */

/** Где искать соседа: контекст расширения или сам движок строк. */
type TNeighbours<TRow extends object> = {
	readonly extensions: Readonly<Record<string, IExtension<TRow> | undefined>>
}

function isColumns<TRow extends ITableRow>(
	ext: IExtension<TRow>,
): ext is ITableColumnsExtension<TRow> {
	return 'shownColumns' in ext && 'columns' in ext && 'engine' in ext
}

function isGrid<TRow extends ITableRow>(ext: IExtension<TRow>): ext is ITableGridExtension<TRow> {
	return 'focusedCell' in ext && 'gridRows' in ext && 'moveFocus' in ext
}

function isSelection<TRow extends object>(ext: IExtension<TRow>): ext is ISelectionExtension<TRow> {
	return 'isSelected' in ext && 'selectMany' in ext && 'deselectMany' in ext && 'multiple' in ext
}

/** Расширение колонок, если оно есть в коллекции. */
export function columnsOf<TRow extends ITableRow>(
	ctx: TNeighbours<TRow> | undefined,
): ITableColumnsExtension<TRow> | undefined {
	const ext = ctx?.extensions.columns

	return ext && isColumns(ext) ? ext : undefined
}

/** Выбор строк, если он есть в коллекции. */
export function selectionOf<TRow extends object>(
	ctx: TNeighbours<TRow> | undefined,
): ISelectionExtension<TRow> | undefined {
	const ext = ctx?.extensions.selection

	return ext && isSelection(ext) ? ext : undefined
}

/** Сетка строк, если она есть в коллекции: её ячейка под фокусом. */
export function gridOf<TRow extends ITableRow>(
	ctx: TNeighbours<TRow> | undefined,
): ITableGridExtension<TRow> | undefined {
	const ext = ctx?.extensions.grid

	return ext && isGrid(ext) ? ext : undefined
}
