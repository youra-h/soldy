import type {
	ITabItem,
	ITabs,
	TActivationExtension,
	TCollection,
	TOrderExtension,
	TPlainExtension,
	TTabsExtension,
} from '@soldy/core'

export const TABS_COLLECTION_KEY = 'tabsCollection' as const

export type TabsExtensions = {
	order: TOrderExtension<ITabItem>
	plain: TPlainExtension<ITabItem>
	activation: TActivationExtension<ITabItem>
	tabs: TTabsExtension<ITabs, ITabItem>
}

export type TabsCollection = TCollection<ITabItem, TabsExtensions>
