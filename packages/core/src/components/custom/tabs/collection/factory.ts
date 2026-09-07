import { TTabsCollection } from './types'
import { TTabsExtension, TTabsContentExtension } from './extensions'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TActivationExtension,
	TOrderExtension,
	TUniqueExtension,
	TMetaExtension,
} from './../../../base'
import TTabsItem from './../item/item.class'
import type { ITabsItem } from './../item/types'
import type { ITabs } from './../types'

export const TabsFactory = (instance: ITabs): TTabsCollection =>
	new TCollectionEngine({
		extensions: {
			factory: new TFactoryExtension<ITabsItem>({ itemCtor: TTabsItem }),
			unique: new TUniqueExtension<ITabsItem>(),
			meta: new TMetaExtension<ITabsItem>(),
			order: new TOrderExtension<ITabsItem>(),
			plain: new TPlainExtension<ITabsItem>(),
			batch: new TBatchExtension<ITabsItem>(),
			activation: new TActivationExtension<ITabsItem>(),
			tabs: new TTabsExtension({ owner: instance }),
			content: new TTabsContentExtension<ITabsItem>(),
		},
	})
