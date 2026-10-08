import type { IControl, IControlProps, TControlEvents } from '../../base/control'
import type { ITranslatable, TTranslatableEvents } from '../../../common'
import type { ITableCollectionProps } from './collection/types'

export type TTableEvents = TControlEvents &
	TTranslatableEvents & {
		/** change:locale */
		'change:locale': (value: string) => void
	}

/** Полный набор пропсов таблицы: свои и коллекции строк (`ITableCollectionProps`). */
export interface ITableProps extends IControlProps, ITableCollectionProps {
	/**
	 * Язык таблицы — тег BCP 47. По нему сортировка сравнивает строки:
	 * алфавит языка и числа внутри строк. Невалидный — `en-US`. В разметке его
	 * нет: язык задаёт приложение на всю библиотеку, и пишет его плагин языка
	 */
	locale?: string
}

export interface ITable extends IControl<ITableProps, TTableEvents>, ITranslatable {
	/** Язык таблицы — тег BCP 47, как задан; невалидный сортировка читает как `en-US` */
	locale: string
	/** Имя чекбокса «выбрать все» в шапке колонки выбора — из словаря, раздел `table` */
	readonly selectAllLabel: string
}
