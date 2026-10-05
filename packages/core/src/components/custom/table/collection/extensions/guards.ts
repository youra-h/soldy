import type { IExtension } from '../../../../base/collection'
import type { ITableColumnsExtension } from './columns/types'

/**
 * Соседи по коллекции строк таблицы.
 *
 * Расширения строк опираются на колонки: ячейки строки — её запись по
 * показанным колонкам, сортировка — по колонке. Контекст расширения знает
 * соседей только как `IExtension`, поэтому соседа узнают проверкой его
 * контракта, а не приведением типа. Классы соседей не импортируются: так
 * расширения не замыкают друг на друга циклом модулей.
 */

/** Где искать соседа: контекст расширения или сам движок строк. */
type TNeighbours<TRow extends object> = {
	readonly extensions: Readonly<Record<string, IExtension<TRow> | undefined>>
}

function isColumns<TRow extends object>(
	ext: IExtension<TRow>,
): ext is ITableColumnsExtension<TRow> {
	return 'shownColumns' in ext && 'columns' in ext && 'engine' in ext
}

/** Расширение колонок, если оно есть в коллекции. */
export function columnsOf<TRow extends object>(
	ctx: TNeighbours<TRow> | undefined,
): ITableColumnsExtension<TRow> | undefined {
	const ext = ctx?.extensions.columns

	return ext && isColumns(ext) ? ext : undefined
}
