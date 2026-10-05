import { selectionExtensions } from '../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../base/collection/create/internal'
import { TMemoryExtension } from '../../../base/collection'
import TTableRow from '../row/row.class'
import type { ITableRow } from '../row/types'
import { TTableColumnsExtension, TTableExtension, TTableSortExtension } from './extensions'

/**
 * Детали рабочей коллекции строк — по порядку установки. См. `tabsExtensions`.
 *
 * Базовые детали с выбором — состав, порядок, жизнь строк и выбор;
 * `factory` строит `TTableRow` из данных. Своё — `columns` (колонки и ячейки
 * строк), `table` (что строки получают от таблицы и выбор показанных) и `sort`
 * (порядок показанных строк по колонкам). Порядок значим: `table` в `install`
 * подписывается на выбор и состав, `sort` — на коллекцию колонок, и оба
 * ставятся после них.
 *
 * `memory` — память выборки: строк у таблицы бывают тысячи, и показанные
 * строки отбираются и сортируются один раз до записи или смены условий, а не
 * на каждое чтение. Последней: кто подписан на выборку, ставится раньше.
 */
export function tableExtensions(): TExtensionSet<ITableRow> {
	return {
		...selectionExtensions<ITableRow>(TTableRow),
		columns: () => new TTableColumnsExtension(),
		table: () => new TTableExtension(),
		sort: () => new TTableSortExtension(),
		memory: () => new TMemoryExtension<ITableRow>(),
	}
}
