import { TTabsExtension } from '@soldy/core'
import { TabsExtensionContribution } from '../../../contributions'

export const TabsExtensionDescriptor = (owner) =>
	defineExtension({
		ctor: TTabsExtension,

		contribution: TabsExtensionContribution,

		options: {
			owner,
		},
	})

export const TabsCollectionDescriptor = defineCollection({})
