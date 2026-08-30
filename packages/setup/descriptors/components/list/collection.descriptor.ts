import { TListExtension, TListItem, type IList } from '@soldy/core'
import { ListExtensionContribution, ListItemExtensionContribution } from '../../../contributions'
import {
	CollectionDescriptor,
	FactoryExtensionDescriptor,
	SelectionExtensionDescriptor,
} from '../collection'
import { defineExtension, defineCollection } from '../../base'

export const ListExtensionDescriptor = () =>
	defineExtension({
		name: 'list',
		namespace: 'list',
		ctor: TListExtension,
		contribution: ListExtensionContribution(),
		itemContribution: ListItemExtensionContribution(),
		// owner передаётся через optionsFactory в ListCollectionDescriptor
	})

export const ListCollectionDescriptor = () =>
	defineCollection({
		extends: CollectionDescriptor(),

		extensions: [
			{ ...FactoryExtensionDescriptor(), optionsFactory: () => ({ itemCtor: TListItem }) },
			SelectionExtensionDescriptor(),
			{
				...ListExtensionDescriptor(),
				optionsFactory: (instance: IList) => ({ owner: instance }),
			},
		],
	})
