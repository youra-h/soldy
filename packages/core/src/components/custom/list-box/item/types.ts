import type { IListItem, IListItemProps, TListItemEvents } from '../../list/item/types'
import type { IListBoxCollectionItemProps } from '../collection/types'

export type TListBoxItemEvents = TListItemEvents

export interface IListBoxItemProps extends IListItemProps, IListBoxCollectionItemProps {}

export interface IListBoxItem
	extends IListItem<IListBoxItemProps, TListBoxItemEvents> {}

