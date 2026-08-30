import type { IList, IListComponentProps, TListEvents, TListStates } from '../list/types'
import type { IListBoxCollectionProps } from './collection/types'
import type { IListBoxItem, IListBoxItemProps } from './list-box-item/types'

export type TListBoxView = 'plain' | 'outlined' | 'filled'

export type TListBoxEvents = TListEvents & {
	/** change:view */
	'change:view': (value: TListBoxView) => void
}

/** Полный набор пропсов ListBox: наследует List (компонентные) + view + коллекция (engine, items, mode). */
export interface IListBoxProps
	extends IListComponentProps,
		IListBoxCollectionProps<IListBoxItemProps, IListBoxItem> {
	/** Внешний вид компонента */
	view?: TListBoxView
}

export type TListBoxStates = TListStates

export interface IListBox extends IList<IListBoxProps, TListBoxEvents, TListBoxStates> {
	/** Внешний вид компонента */
	view: TListBoxView
}

