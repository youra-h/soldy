import { TCollectionEngine } from '../../../base/collection'
import type {
	TListBaseCollectionExtensions,
	IListCollectionProps,
	IListCollectionItemProps,
} from '../../list/collection/types'
import { TListBoxExtension } from './extensions'
import type { IListBox } from '../types'
import type { IListBoxItem } from '../list-box-item/types'
import type { IListBoxItemProps } from '../list-box-item/types'

export type TListBoxCollectionExtensions = TListBaseCollectionExtensions<IListBoxItem> & {
	list: TListBoxExtension<IListBox, IListBoxItem>
}

export type TListBoxCollection = TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>

/**
 * Owner-level props коллекции ListBox.
 * Наследует List и добавляет engine-тип ListBox.
 */
export interface IListBoxCollectionProps<TItemProps = IListBoxItemProps, TItem = IListBoxItem>
	extends IListCollectionProps<TItemProps, TItem, TListBoxCollection> {}

/**
 * Item-level props элемента ListBox.
 * Наследует item-пропсы List.
 */
export interface IListBoxCollectionItemProps extends IListCollectionItemProps {}
