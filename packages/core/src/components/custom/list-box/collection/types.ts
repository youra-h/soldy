import {
	TFactoryExtension,
	TCollectionEngine,
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
import { TListBoxExtension } from './extensions'
import type { IListBox } from '../types'
import type { IListBoxItem } from '../list-box-item/types'
import type { IListBoxItemProps } from '../list-box-item/types'

export type TListBoxCollectionExtensions = {
	factory: TFactoryExtension<IListBoxItem>
	unique: TUniqueExtension<IListBoxItem>
	meta: TMetaExtension<IListBoxItem>
	order: TOrderExtension<IListBoxItem>
	plain: TPlainExtension<IListBoxItem>
	batch: TBatchExtension<IListBoxItem>
	selection: TSelectionExtension<IListBoxItem>
	listBox: TListBoxExtension<IListBox, IListBoxItem>
}

export type TListBoxCollection = TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>

/**
 * Output-состояние коллекции ListBox (возвращается useVueCollection как refs).
 */
export interface IListBoxCollectionOutput {
	items: ReadonlyArray<IListBoxItem>
	trackBy?: (item: IListBoxItem) => any
	mode: TSelectionMode
	selected: IListBoxItem[]
}

/**
 * Owner-level props коллекции ListBox.
 * Объединяет pass-through engine + batch (items, trackBy) + selection (mode).
 */
export interface IListBoxCollectionProps<TItemProps = IListBoxItemProps, TItem = IListBoxItem>
	extends ICollectionProps<TListBoxCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/**
 * Item-level props элемента ListBox.
 * Объединяет selection (selected) + потенциальные item-расширения.
 */
export interface IListBoxCollectionItemProps extends ISelectionCollectionItemProps {}
