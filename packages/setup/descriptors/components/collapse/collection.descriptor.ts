import { TCollapseExtension, TCollapseItem, type ICollapse } from '@soldy/core'
import {
	CollapseExtensionContribution,
	CollapseItemExtensionContribution,
} from '../../../contributions'
import {
	CollectionDescriptor,
	FactoryExtensionDescriptor,
	SelectionExtensionDescriptor,
} from '../collection'
import { defineExtension, defineCollection } from '../../base'

export const CollapseExtensionDescriptor = () =>
	defineExtension({
		name: 'collapse',
		namespace: 'collapse',
		ctor: TCollapseExtension,
		contribution: CollapseExtensionContribution(),
		itemContribution: CollapseItemExtensionContribution(),
		// owner передаётся через optionsFactory в CollapseCollectionDescriptor
	})

export const CollapseCollectionDescriptor = () =>
	defineCollection({
		extends: CollectionDescriptor(),

		extensions: [
			{
				...FactoryExtensionDescriptor(),
				optionsFactory: () => ({ itemCtor: TCollapseItem }),
			},
			SelectionExtensionDescriptor(),
			{
				...CollapseExtensionDescriptor(),
				optionsFactory: (instance: ICollapse) => ({ owner: instance }),
			},
		],
	})
