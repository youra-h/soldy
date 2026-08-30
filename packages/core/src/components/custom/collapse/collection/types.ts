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
import { TCollapseExtension } from './extensions'
import type { ICollapse } from '../types'
import type { ICollapseItem } from '../collapse-item/types'
import type { ICollapseItemProps } from '../collapse-item/types'

export type TCollapseCollectionExtensions = {
	factory: TFactoryExtension<ICollapseItem>
	unique: TUniqueExtension<ICollapseItem>
	meta: TMetaExtension<ICollapseItem>
	order: TOrderExtension<ICollapseItem>
	plain: TPlainExtension<ICollapseItem>
	batch: TBatchExtension<ICollapseItem>
	selection: TSelectionExtension<ICollapseItem>
	collapse: TCollapseExtension<ICollapse, ICollapseItem>
}

export type TCollapseCollection = TCollection<ICollapseItem, TCollapseCollectionExtensions>

/**
 * Output-состояние коллекции Collapse (возвращается useVueCollection как refs).
 */
export interface ICollapseCollectionOutput {
	items: ReadonlyArray<ICollapseItem>
	trackBy?: (item: ICollapseItem) => any
	mode: TSelectionMode
	selected: ICollapseItem[]
}

/**
 * Owner-level props коллекции Collapse.
 * Объединяет pass-through engine + batch (items, trackBy) + selection (mode).
 */
export interface ICollapseCollectionProps<TItemProps = ICollapseItemProps, TItem = ICollapseItem>
	extends ICollectionProps<TCollapseCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/**
 * Item-level props элемента Collapse.
 * Объединяет selection (selected) + потенциальные item-расширения.
 */
export interface ICollapseCollectionItemProps extends ISelectionCollectionItemProps {}
