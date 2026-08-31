import type { IControl, IControlProps, TControlEvents, TControlStates } from '../../base/control'
import type { TStorageDriverEvents } from '../../base/collection'
import type { TScrollBehavior } from '../../../common'
import type { IListCollectionProps } from './collection/types'
import type { IListItem, IListItemProps } from './list-item/types'

export type TListEvents = TControlEvents &
	TStorageDriverEvents<IListItem> & {
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
export interface IListComponentProps extends IControlProps {
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

export type TListStates = TControlStates

export interface IList<
	TProps extends IListComponentProps = IListProps,
	TEvents extends TListEvents = TListEvents,
	TStates extends TListStates = TListStates,
> extends IControl<TProps, TEvents, TStates> {
	/** Максимальное количество видимых строк (0 = без ограничений) */
	maxRows: number
	/** Ширина бокса определяется по самому длинному тексту */
	autoWidth: boolean
	/** Перенос текста на новую строку (false = троеточие) */
	wordWrap: boolean
	/** Поведение скролла при выделении элемента */
	scrollBehavior: TScrollBehavior
}
