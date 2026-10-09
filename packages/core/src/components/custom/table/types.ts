import type { IControl, IControlProps, TControlEvents } from '../../base/control'
import type { ITableCollectionProps } from './collection/types'

export type TTableEvents = TControlEvents & {
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:stickyHead */
	'change:stickyHead': (value: boolean) => void
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
}

export interface ITable extends IControl<ITableProps, TTableEvents> {
	/** Язык таблицы — тег BCP 47, как задан; невалидный сортировка читает как `en-US` */
	locale: string
	/** Шапка закреплена у верхнего края прокрутки */
	stickyHead: boolean
}
