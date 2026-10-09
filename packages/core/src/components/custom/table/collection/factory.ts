import { selectionExtensions } from '../../../base/collection/create/internal'
import type { TExtensionSet } from '../../../base/collection/create/internal'
import { TMemoryExtension, TSelectionExtension } from '../../../base/collection'
import TTableRow from '../row/row.class'
import type { ITableRow } from '../row/types'
import {
	TTableColumnsExtension,
	TTableExtension,
	TTableGridExtension,
	TTableSortExtension,
	TTableVirtualExtension,
} from './extensions'

/**
 * Детали рабочей коллекции строк — по порядку установки. См. `tabsExtensions`.
 *
 * Базовые детали с выбором — состав, порядок, жизнь строк и выбор;
 * `factory` строит `TTableRow` из данных. Своё — `columns` (колонки и ячейки
 * строк), `table` (что строки получают от таблицы, выбор показанных и
 * чекбоксы колонки выбора), `sort` (порядок показанных строк по колонкам) и
 * `grid` (режим сетки: ячейка под фокусом и выбор строки нажатием) и
 * `virtual` (режим окна: тело рисует только видимые строки). Порядок значим:
 * `table` в `install` подписывается на выбор и состав, `sort` — на коллекцию
 * колонок, `grid` — на всех троих, `virtual` — на состав и сетку, и ставятся
 * они после них.
 *
 * `selection.mode` по умолчанию `'none'`, а не `'single'` из
 * `TSelectionExtension`: режим решает и выбор, и колонку выбора, а таблице без
 * просьбы потребителя колонка чекбоксов не нужна. Дефолт самого
 * `TSelectionExtension` не трогаем — переопределение только здесь, как у Tags.
 *
 * `memory` — память выборки: строк у таблицы бывают тысячи, и показанные
 * строки отбираются и сортируются один раз до записи или смены условий, а не
 * на каждое чтение. Последней: кто подписан на выборку, ставится раньше.
 */
export function tableExtensions(): TExtensionSet<ITableRow> {
	return {
		...selectionExtensions<ITableRow>(TTableRow),
		selection: () => {
			const selection = new TSelectionExtension<ITableRow>()

			selection.mode = 'none'

			return selection
		},
		columns: () => new TTableColumnsExtension(),
		table: () => new TTableExtension(),
		sort: () => new TTableSortExtension(),
		grid: () => new TTableGridExtension(),
		virtual: () => new TTableVirtualExtension(),
		memory: () => new TMemoryExtension<ITableRow>(),
	}
}
