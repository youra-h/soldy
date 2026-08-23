import { TTabsExtension, TTabItem, type ITabs } from '@soldy/core'
import { TabsExtensionContribution, TabsItemExtensionContribution } from '../../../contributions'
import {
	ActivationExtensionDescriptor,
	BatchExtensionDescriptor,
	FactoryExtensionDescriptor,
	OrderExtensionDescriptor,
	PlainExtensionDescriptor,
	UniqueExtensionDescriptor,
} from '../collection'
import { defineExtension, defineCollection } from '../../base'

export const TabsExtensionDescriptor = defineExtension({
	name: 'tabs',
	namespace: 'tabs',
	ctor: TTabsExtension,
	contribution: TabsExtensionContribution,
	itemContribution: TabsItemExtensionContribution,
	// owner передаётся через optionsFactory в TabsCollectionDescriptor
})

export const TabsCollectionDescriptor = defineCollection({
	extensions: [
		{ ...FactoryExtensionDescriptor, optionsFactory: () => ({ itemCtor: TTabItem }) },
		UniqueExtensionDescriptor,
		OrderExtensionDescriptor,
		PlainExtensionDescriptor,
		BatchExtensionDescriptor,
		ActivationExtensionDescriptor,
		{ ...TabsExtensionDescriptor, optionsFactory: (instance: ITabs) => ({ owner: instance }) },
	],
})
