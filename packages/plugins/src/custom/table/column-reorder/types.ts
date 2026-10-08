import type { ITableColumn } from '@soldy-ui/core'
import type { TPluginEvents } from '../../../base'

/**
 * Своих событий у плагина нет: что колонку взяли, куда несут и куда она
 * встала, сообщает расширение `columns` — наборами колонок и `column:move`.
 * Второй путь к тем же фактам через события плагина разошёлся бы с первым.
 */
export type TTableColumnReorderPluginEvents = TPluginEvents

/** Нажатие на заголовок, которое может стать жестом перестановки. */
export type TTableColumnReorderPress = {
	/** `pointerId` указателя: чужие указатели жест не двигают */
	pointer: number
	/** Точка нажатия по строке — `clientX` */
	origin: number
	/** Колонка, заголовок которой нажали */
	column: ITableColumn
	/** Её заголовок — его плагин сдвигает за указателем */
	cell: Element
	/** Нажатие стало жестом: указатель ушёл дальше порога, и колонку взяли */
	dragging: boolean
}
