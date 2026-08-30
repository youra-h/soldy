import { TListBoxExtension, TListBoxItem, type IListBox } from '@soldy/core'
import {
	ListBoxExtensionContribution,
	ListBoxItemExtensionContribution,
} from '../../../contributions'
import {
	CollectionDescriptor,
	FactoryExtensionDescriptor,
	SelectionExtensionDescriptor,
} from '../collection'
import { defineExtension, defineCollection } from '../../base'

export const ListBoxExtensionDescriptor = () =>
	defineExtension({
		name: 'listBox',
		namespace: 'list',
		ctor: TListBoxExtension,
		contribution: ListBoxExtensionContribution(),
		itemContribution: ListBoxItemExtensionContribution(),
		// owner передаётся через optionsFactory в ListBoxCollectionDescriptor
	})

export const ListBoxCollectionDescriptor = () =>
	defineCollection({
		extends: CollectionDescriptor(),

		extensions: [
			{ ...FactoryExtensionDescriptor(), optionsFactory: () => ({ itemCtor: TListBoxItem }) },
			SelectionExtensionDescriptor(),
			{
				...ListBoxExtensionDescriptor(),
				optionsFactory: (instance: IListBox) => ({ owner: instance }),
			},
		],
	})
