import type { TTableGridColumn, TTableGridRow } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: куда встал фокус и что выбрано, сообщает
 * коллекция — расширение `grid` и выбор строк. Второй путь к тем же фактам
 * разошёлся бы с первым.
 */
export type TTableGridPluginEvents = TPluginEvents

export interface ITableGridPluginOptions {
	/**
	 * На сколько строк ведут PageUp и PageDown. По умолчанию — 10: APG
	 * оставляет число автору, и десять строк — около экрана таблицы обычной
	 * высоты.
	 */
	pageStep?: number
}

/** Ячейка сетки в документе — её строка и колонка в сетке и узел. */
export type TTableGridHit = {
	row: TTableGridRow
	column: TTableGridColumn
	element: Element
}
