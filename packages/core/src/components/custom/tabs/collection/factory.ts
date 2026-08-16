import { TTabsCollection } from './types'
import { TTabsExtension } from './extensions/tabs.extension'
import {
	TCollection,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TActivationExtension,
	TOrderExtension,
	TUniqueExtension,
} from './../../../base'
import TTabItem from './../tab-item/tab-item.class'
import type { ITabItem } from './../tab-item/types'
import type { ITabs } from './../types'

export const TabsFactory = (instance: ITabs): TTabsCollection =>
	new TCollection({
		extensions: {
			factory: new TFactoryExtension<ITabItem>({ itemCtor: TTabItem }),
			unique: new TUniqueExtension<ITabItem>(),
			order: new TOrderExtension<ITabItem>(),
			plain: new TPlainExtension<ITabItem>(),
			batch: new TBatchExtension<ITabItem>(),
			activation: new TActivationExtension<ITabItem>(),
			tabs: new TTabsExtension({ owner: instance }),
		},
	})
