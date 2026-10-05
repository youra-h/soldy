import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../../base/component-view'
import type { TTableRecord } from '../row/types'

/**
 * Выравнивание содержимого колонки.
 *
 * Значение библиотеки, а не темы: смысл у него один в любой теме. Стороны
 * логические: `start` и `end` — начало и конец строки в направлении письма.
 */
export type TTableColumnAlign = 'start' | 'center' | 'end'

/**
 * Своё сравнение двух записей для сортировки по колонке — по возрастанию, как
 * у `Array.prototype.sort`: отрицательное — `a` раньше, положительное — позже,
 * ноль — равны, и равные остаются в порядке данных. Убывание — тот же порядок
 * наоборот. Строки без записи сравнение не получает: они всегда в конце.
 */
export type TTableCompare = (a: TTableRecord, b: TTableRecord) => number

/**
 * CSS-переменные заголовка колонки — и только они: итог ширины с единицей
 * (`--s-table-column-width`). Ширину ячейки шапки ставит тема, а по шапке
 * раскладка таблицы режет колонку.
 */
export type TTableColumnStyle = Record<`--${string}`, string>

export type TTableColumnEvents = TComponentViewEvents & {
	/** change:field */
	'change:field': (value: string) => void
	/** change:text */
	'change:text': (value: string) => void
	/**
	 * Итог ширины сменился — от своего значения или от границ. `undefined` —
	 * ширину решает тема
	 */
	'change:width': (value: number | undefined) => void
	/** change:minWidth */
	'change:minWidth': (value: number | undefined) => void
	/** change:maxWidth */
	'change:maxWidth': (value: number | undefined) => void
	/** change:align */
	'change:align': (value: TTableColumnAlign) => void
	/** change:sortable */
	'change:sortable': (value: boolean) => void
	/** change:compare */
	'change:compare': (value: TTableCompare | undefined) => void
	/** change:rowHeader */
	'change:rowHeader': (value: boolean) => void
}

export interface ITableColumnProps extends IComponentViewProps {
	/** Ключ значения в записи строки — и ключ колонки в коллекции колонок */
	field?: string
	/** Текст заголовка */
	text?: string
	/** Ширина, px. Не задана — ширину решает тема */
	width?: number
	/** Нижняя граница ширины, px. Сильнее верхней, как в CSS */
	minWidth?: number
	/** Верхняя граница ширины, px */
	maxWidth?: number
	/** Выравнивание содержимого колонки */
	align?: TTableColumnAlign
	/** Пользователь сортирует строки по колонке — кнопкой в заголовке */
	sortable?: boolean
	/** Своё сравнение записей. Не задано — значения поля `field` */
	compare?: TTableCompare
	/** Ячейки колонки — заголовки строк: по их тексту строку называют */
	rowHeader?: boolean
}

export interface ITableColumn<
	TProps extends ITableColumnProps = ITableColumnProps,
	TEvents extends TTableColumnEvents = TTableColumnEvents,
> extends IComponentView<TProps, TEvents> {
	/** Ключ значения в записи строки — и ключ колонки в коллекции колонок */
	field: string
	/** Текст заголовка */
	text: string
	/**
	 * Ширина — итог: своё значение, прижатое к границам. Записывается своё,
	 * а читается итог. `undefined` — ширину решает тема
	 */
	width: number | undefined
	/** Нижняя граница ширины, px */
	minWidth: number | undefined
	/** Верхняя граница ширины, px */
	maxWidth: number | undefined
	/** Выравнивание содержимого колонки */
	align: TTableColumnAlign
	/**
	 * Пользователь сортирует строки по колонке — кнопкой в заголовке. Решение
	 * потребителя, поэтому по умолчанию нет. Код сортирует строки и по
	 * несортируемой колонке — записью состояния сортировки
	 */
	sortable: boolean
	/** Своё сравнение записей. Не задано — значения поля `field` */
	compare: TTableCompare | undefined
	/**
	 * Ячейки колонки — заголовки строк (`th scope="row"`): по тексту ячейки
	 * строку называют, в том числе её чекбокс выбора. Решение потребителя,
	 * поэтому по умолчанию нет
	 */
	rowHeader: boolean
	/**
	 * `--s-table-column-width` — итог ширины в px. Ширины нет — переменной нет,
	 * и ширину колонки решает тема
	 */
	readonly widthStyle: TTableColumnStyle
}
