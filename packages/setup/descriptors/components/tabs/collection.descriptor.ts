import { TTabsExtension, TTabItem, type ITabs } from '@soldy/core'
import { TabsExtensionContribution, TabsItemExtensionContribution } from '../../../contributions'
import {
	ActivationExtensionDescriptor,
	CollectionDescriptor,
	FactoryExtensionDescriptor,
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
	extends: CollectionDescriptor,

	extensions: [
		{ ...FactoryExtensionDescriptor, optionsFactory: () => ({ itemCtor: TTabItem }) },
		ActivationExtensionDescriptor,
		{ ...TabsExtensionDescriptor, optionsFactory: (instance: ITabs) => ({ owner: instance }) },
	],
})
