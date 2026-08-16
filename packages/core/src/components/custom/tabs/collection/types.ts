import {
	TActivationExtension,
	TBatchExtension,
	TCollection,
	TOrderExtension,
	TPlainExtension,
	TFactoryExtension,
	TUniqueExtension,
} from '../../../base/collection'
import { TTabsExtension } from './extensions'
import type { ITabs } from '../types'
import type { ITabItem } from '../tab-item/types'

export type TTabsCollectionExtensions = {
	factory: TFactoryExtension<ITabItem>
	unique: TUniqueExtension<ITabItem>
	order: TOrderExtension<ITabItem>
	plain: TPlainExtension<ITabItem>
	batch: TBatchExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

export type TTabsCollection = TCollection<ITabItem, TTabsCollectionExtensions>
