import {
	TActivationExtension,
	TBatchExtension,
	TCollection,
	TOrderExtension,
	TPlainExtension,
	TFactoryExtension,
	TUniqueExtension,
	TMetaExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	IActivationCollectionItemProps,
} from '../../../base/collection'
import { TTabsExtension } from './extensions'
import type { ITabs } from '../types'
import type { ITabItem } from '../tab-item/types'
import type { ITabItemProps } from '../tab-item/types'

export type TTabsCollectionExtensions = {
	factory: TFactoryExtension<ITabItem>
	unique: TUniqueExtension<ITabItem>
	meta: TMetaExtension<ITabItem>
	order: TOrderExtension<ITabItem>
	plain: TPlainExtension<ITabItem>
	batch: TBatchExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

export type TTabsCollection = TCollection<ITabItem, TTabsCollectionExtensions>

/**
 * Owner-level props коллекции Tabs.
 * Объединяет pass-through engine + batch (items, trackBy).
 */
export interface ITabsCollectionProps<TItemProps = ITabItemProps, TItem = ITabItem>
	extends ICollectionProps<TTabsCollection>,
		IBatchCollectionProps<TItemProps, TItem> {}

/**
 * Item-level props элемента Tabs.
 * Объединяет activation (active) + потенциальные item-расширения.
 */
export interface ITabsCollectionItemProps extends IActivationCollectionItemProps {}
