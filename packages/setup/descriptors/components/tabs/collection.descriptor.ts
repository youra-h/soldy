import { TTabsExtension } from '@soldy/core'
import { TabsExtensionContribution } from '../../../contributions'

export const TabsExtensionDescriptor = defineCollection({
	ctor: TTabsExtension,

	contribution: TabsExtensionContribution,
})

export const TabsCollectionDescriptor = defineCollection({
	contribution: TabsExtensionContribution,
})
