import {
	TFactoryExtension,
	TCollection,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TSelectionMode,
} from '../../../base/collection'
import { TListExtension } from './extensions'
import type { IList } from '../types'
import type { IListItem } from '../list-item/types'
import type { IListItemProps } from '../list-item/types'

export type TListCollectionExtensions = {
	factory: TFactoryExtension<IListItem>
	unique: TUniqueExtension<IListItem>
	meta: TMetaExtension<IListItem>
	order: TOrderExtension<IListItem>
	plain: TPlainExtension<IListItem>
	batch: TBatchExtension<IListItem>
	selection: TSelectionExtension<IListItem>
	list: TListExtension<IList, IListItem>
}

export type TListCollection = TCollection<IListItem, TListCollectionExtensions>

/**
 * Output-состояние коллекции List (возвращается useVueCollection как refs).
 */
export interface IListCollectionOutput {
	items: ReadonlyArray<IListItem>
	trackBy?: (item: IListItem) => any
	mode: TSelectionMode
	selected: IListItem[]
}

/**
 * Owner-level props коллекции List.
 * Объединяет pass-through engine + batch (items, trackBy) + selection (mode).
 */
export interface IListCollectionProps<TItemProps = IListItemProps, TItem = IListItem>
	extends
		ICollectionProps<TListCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/**
 * Item-level props элемента List.
 * Объединяет selection (selected) + потенциальные item-расширения.
 */
export interface IListCollectionItemProps extends ISelectionCollectionItemProps {}
