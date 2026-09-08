import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
	TValueControlStates,
} from '../../base/value-control'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { TScrollBehavior } from '../../../common'
import type { IListCollectionProps } from './collection/types'
import type { IListItem, IListItemProps } from './item/types'

/**
 * Значение списка — то, что выбрано, в виде значений элементов.
 *
 * Скаляр в режиме `single`, массив в `multiple`, `undefined` когда не выбрано
 * ничего. Не отдельное состояние, а проекция выбора коллекции: связь в обе
 * стороны держит `TValueSelectionExtension`.
 */
export type TListValue = string | number | (string | number)[] | undefined

export type TListEvents = TValueControlEvents<TListValue> &
	TCollectionStorageDriverEvents<IListItem> & {
		/** change:maxRows */
		'change:maxRows': (value: number) => void
		/** change:autoWidth */
		'change:autoWidth': (value: boolean) => void
		/** change:wordWrap */
		'change:wordWrap': (value: boolean) => void
		/** change:scrollBehavior */
		'change:scrollBehavior': (value: TScrollBehavior) => void
	}

/** Пропсы самого компонента List (без коллекционной части). */
export interface IListComponentProps extends IValueControlProps<TListValue> {
	/** Максимальное количество видимых строк (0 = без ограничений) */
	maxRows?: number
	/** Ширина бокса определяется по самому длинному тексту */
	autoWidth?: boolean
	/** Перенос текста на новую строку (false = троеточие) */
	wordWrap?: boolean
	/** Поведение скролла при выделении элемента */
	scrollBehavior?: TScrollBehavior
}

/** Полный набор пропсов List: компонент + коллекция (engine, items, trackBy, mode). */
export interface IListProps
	extends IListComponentProps, IListCollectionProps<IListItemProps, IListItem> {}

export type TListStates = TValueControlStates<TListValue>

export interface IList<
	TProps extends IListComponentProps = IListProps,
	TEvents extends TListEvents = TListEvents,
	TStates extends TListStates = TListStates,
> extends IValueControl<TListValue, TProps, TEvents, TStates> {
	/** Максимальное количество видимых строк (0 = без ограничений) */
	maxRows: number
	/** Ширина бокса определяется по самому длинному тексту */
	autoWidth: boolean
	/** Перенос текста на новую строку (false = троеточие) */
	wordWrap: boolean
	/** Поведение скролла при выделении элемента */
	scrollBehavior: TScrollBehavior
}
