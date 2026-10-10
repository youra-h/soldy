import type { IControl, IControlProps, TControlEvents } from '../../base/control'
import type { ITableCollectionProps } from './collection/types'

/**
 * Как гибкие колонки — колонки без своей ширины — делят место таблицы.
 *
 * - `none` — не делят: каждая в ширине по умолчанию, прижатой к своим
 *   границам, и таблица шириной в сумму колонок;
 * - `auto` — таблица во всю ширину места: гибкие колонки растут от ширины по
 *   умолчанию до `maxWidth`, деля место поровну;
 * - `contain` — гибкие колонки ровно заполняют место: сжимаются до
 *   `minWidth` и растут до `maxWidth`.
 *
 * Места не хватает и в самой узкой раскладке — таблица шире места, и её окно
 * прокручивается. Значение библиотеки, а не темы: его читает ядро.
 */
export type TTableColumnFit = 'none' | 'auto' | 'contain'

export type TTableEvents = TControlEvents & {
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:stickyHead */
	'change:stickyHead': (value: boolean) => void
	/** change:columnFit */
	'change:columnFit': (value: TTableColumnFit) => void
}

/** Полный набор пропсов таблицы: свои и коллекции строк (`ITableCollectionProps`). */
export interface ITableProps extends IControlProps, ITableCollectionProps {
	/**
	 * Язык таблицы — тег BCP 47. По нему сортировка сравнивает строки:
	 * алфавит языка и числа внутри строк. Невалидный — `en-US`. В разметке его
	 * нет: с setup его пишет плагин языка — тег локали поддерева
	 */
	locale?: string
	/**
	 * Закреплённая шапка: шапка стоит у верхнего края прокрутки — контейнера
	 * или страницы, — а строки уходят под неё. Без него шапка уезжает вместе
	 * со строками
	 */
	stickyHead?: boolean
	/**
	 * Как колонки без своей ширины делят место таблицы: `none` — стоят в
	 * ширине по умолчанию, `auto` — растут до `maxWidth` во всю ширину места,
	 * `contain` — ровно заполняют место, сжимаясь до `minWidth`
	 */
	columnFit?: TTableColumnFit
}

export interface ITable extends IControl<ITableProps, TTableEvents> {
	/** Язык таблицы — тег BCP 47, как задан; невалидный сортировка читает как `en-US` */
	locale: string
	/** Шапка закреплена у верхнего края прокрутки */
	stickyHead: boolean
	/** Как колонки без своей ширины делят место таблицы */
	columnFit: TTableColumnFit
}
