import {
	TActivationExtension,
	TBatchExtension,
	TCollectionEngine,
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
import { TTabsExtension, TTabsContentExtension } from './extensions'
import type { ITabs } from '../types'
import type { ITabsItem } from '../item/types'
import type { ITabsItemProps } from '../item/types'

export type TTabsCollectionExtensions = {
	factory: TFactoryExtension<ITabsItem>
	unique: TUniqueExtension<ITabsItem>
	meta: TMetaExtension<ITabsItem>
	order: TOrderExtension<ITabsItem>
	plain: TPlainExtension<ITabsItem>
	batch: TBatchExtension<ITabsItem>
	activation: TActivationExtension<ITabsItem>
	tabs: TTabsExtension<ITabs, ITabsItem>
	content: TTabsContentExtension<ITabsItem>
}

export type TTabsCollection = TCollectionEngine<ITabsItem, TTabsCollectionExtensions>

/**
 * Owner-level props коллекции Tabs.
 * Объединяет pass-through engine + batch (items, trackBy).
 */
export interface ITabsCollectionProps<TItemProps = ITabsItemProps, TItem = ITabsItem>
	extends ICollectionProps<TTabsCollection>, IBatchCollectionProps<TItemProps, TItem> {}

/**
 * Item-level props элемента Tabs.
 * Объединяет activation (active) + потенциальные item-расширения.
 */
export interface ITabsCollectionItemProps extends IActivationCollectionItemProps {}
