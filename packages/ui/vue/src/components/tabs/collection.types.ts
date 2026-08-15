import type {
	ITabItem,
	ITabs,
	TActivationExtension,
	TBatchExtension,
	TCollection,
	TOrderExtension,
	TPlainExtension,
	TTabsExtension,
	TFactoryExtension,
	TUniqueExtension,
} from '@soldy/core'

export const TABS_COLLECTION_KEY = 'tabsCollection' as const

export type TTabsExtensions = {
	factory: TFactoryExtension<ITabItem>
	unique: TUniqueExtension<ITabItem>
	order: TOrderExtension<ITabItem>
	plain: TPlainExtension<ITabItem>
	batch: TBatchExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

export type TTabsCollection = TCollection<ITabItem, TTabsExtensions>
