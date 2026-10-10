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
	/**
	 * Жест: указатель ушёл дальше порога, и колонку взяли. До этого — `null`:
	 * нажатие остаётся нажатием кнопки сортировки
	 */
	gesture: TTableColumnReorderGesture | null
}

/** Взятая колонка: где стояли заголовки, когда её взяли, и куда её несут. */
export type TTableColumnReorderGesture = {
	/**
	 * Заголовки показанных колонок на старте жеста, по их порядку. По ним
	 * считаются место и приземление: тема сдвигает соседей, и их коробки
	 * посреди жеста — уже не места колонок
	 */
	boxes: ReadonlyArray<TTableColumnReorderBox>
	/** Место взятой колонки среди показанных */
	from: number
	/** Место, куда колонку несут сейчас; на своём месте — `from` */
	place: number
	/**
	 * Шапка стоит — таблица в `none`: ширины корню нет, и колонка встаёт на
	 * отпускании, без приземления
	 */
	still: boolean
}

/**
 * Заголовок на старте жеста — по строке, относительно корня таблицы, px: так
 * снимок переживает прокрутку посреди жеста.
 */
export type TTableColumnReorderBox = {
	/** Левый край */
	left: number
	/** Ширина */
	width: number
}

/** Отпущенный заголовок: едет на место, пока не доиграл переход темы. */
export type TTableColumnReorderLanding = {
	/** Заголовок взятой колонки */
	cell: Element
	/** Отпустили на месте — `dragEnd`; отмена — `dragCancel` */
	commit: boolean
	/** Кадр, в котором заголовок получит место: к нему `data-landing` уже в разметке */
	frame: number | null
	/** Отмена ожидания переходов заголовка — после кадра */
	wait: (() => void) | null
}
