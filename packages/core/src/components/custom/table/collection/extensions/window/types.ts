import type { IExtension } from '../../../../../base/collection'
import type { TAriaAttributes } from '../../../../../../common'
import type { ITableRow } from '../../../row/types'

export type TTableWindowEvents = {
	/** Набор строки шапки сменился: окно поставили или сняли */
	'change:headRowAria': (value: TAriaAttributes) => void
}

/**
 * Контракт окна таблицы — что таблица делает, пока её тело рисует окно:
 * число и номера строк по APG, набор шапки и строка ячейки сетки в окне.
 */
export interface ITableWindowExtension<TRow extends ITableRow = ITableRow> extends IExtension<
	TRow,
	TTableWindowEvents
> {
	/** Набор строки шапки: в окне — её номер среди строк таблицы, без окна пуст */
	readonly headRowAria: TAriaAttributes
}
