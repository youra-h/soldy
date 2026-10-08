import type { IControl, IControlProps, TControlEvents } from '../../base/control'
import type { ITableCollectionProps } from './collection/types'

export type TTableEvents = TControlEvents & {
	/** change:locale */
	'change:locale': (value: string) => void
}

/** Полный набор пропсов таблицы: свои и коллекции строк (`ITableCollectionProps`). */
export interface ITableProps extends IControlProps, ITableCollectionProps {
	/**
	 * Язык таблицы — тег BCP 47. По нему сортировка сравнивает строки:
	 * алфавит языка и числа внутри строк. Невалидный — `en-US`. В разметке его
	 * нет: с setup его пишет плагин языка — тег локали поддерева
	 */
	locale?: string
}

export interface ITable extends IControl<ITableProps, TTableEvents> {
	/** Язык таблицы — тег BCP 47, как задан; невалидный сортировка читает как `en-US` */
	locale: string
}
