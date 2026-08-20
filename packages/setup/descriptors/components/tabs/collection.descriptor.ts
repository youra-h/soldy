import { TTabsExtension } from '@soldy/core'
import { OrderExtensionContribution, TabsExtensionContribution } from '../../../contributions'
import {
	ActivationExtensionDescriptor,
	BatchExtensionDescriptor,
	FactoryExtensionDescriptor,
	PlainExtensionDescriptor,
	UniqueExtensionDescriptor,
} from '../collection'

export const TabsExtensionDescriptor = defineExtension({
	ctor: TTabsExtension,

	contribution: TabsExtensionContribution,

	options: {
		owner,
	},
})

export const TabsCollectionDescriptor = defineCollection({
	extension: [
		FactoryExtensionDescriptor,
		UniqueExtensionDescriptor,
		OrderExtensionContribution,
		PlainExtensionDescriptor,
		BatchExtensionDescriptor,
		ActivationExtensionDescriptor,
		TabsExtensionDescriptor,
	],
})
