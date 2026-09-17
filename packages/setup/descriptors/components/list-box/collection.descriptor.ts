import { defineComponent, defineDescriptor } from '../../../define'
import { TListBoxCollectionFacade, TListBoxItemCollectionFacade } from '@soldy/core'
import {
	ListBoxCollectionContribution,
	ListBoxCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const ListBoxCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: ListBoxCollectionContribution(),
	}),
)

export const ListBoxCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TListBoxItemCollectionFacade,

		contribution: ListBoxCollectionItemContribution(),
	}),
)
