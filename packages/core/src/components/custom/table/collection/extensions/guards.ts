import type { IExtension } from '../../../../base/collection'
import type { TNeighbours } from '../../../../base/collection/engine/extension/neighbours'
import type { ITableRow } from '../../row/types'
import type { ITableColumnsExtension } from './columns/types'
import type { ITableGridExtension } from './grid/types'

/**
 * Состав и выбор — общие с остальными коллекциями: выборка состава —
 * показанные строки, выбор — выбранные.
 */
export { batchOf, selectionOf } from '../../../../base/collection/engine/extension/neighbours'

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

function isColumns<TRow extends ITableRow>(
	ext: IExtension<TRow>,
): ext is ITableColumnsExtension<TRow> {
	return 'shownColumns' in ext && 'columns' in ext && 'engine' in ext
}

function isGrid<TRow extends ITableRow>(ext: IExtension<TRow>): ext is ITableGridExtension<TRow> {
	return 'focusedCell' in ext && 'gridRows' in ext && 'moveFocus' in ext
}

/** Расширение колонок, если оно есть в коллекции. */
export function columnsOf<TRow extends ITableRow>(
	ctx: TNeighbours<TRow> | undefined,
): ITableColumnsExtension<TRow> | undefined {
	const ext = ctx?.extensions.columns

	return ext && isColumns(ext) ? ext : undefined
}

/** Сетка строк, если она есть в коллекции: её ячейка под фокусом. */
export function gridOf<TRow extends ITableRow>(
	ctx: TNeighbours<TRow> | undefined,
): ITableGridExtension<TRow> | undefined {
	const ext = ctx?.extensions.grid

	return ext && isGrid(ext) ? ext : undefined
}
