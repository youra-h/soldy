import type {
	IComponentView,
	IComponentViewProps,
	TComponentViewEvents,
} from '../../../base/component-view'

/**
 * Выравнивание содержимого колонки.
 *
 * Значение библиотеки, а не темы: смысл у него один в любой теме. Стороны
 * логические: `start` и `end` — начало и конец строки в направлении письма.
 */
export type TTableColumnAlign = 'start' | 'center' | 'end'

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
}
