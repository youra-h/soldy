import { defineComponent } from '../../base'
import { TListBoxCollectionFacade, TListBoxItemCollectionFacade } from '@soldy/core'
import {
	ListBoxCollectionContribution,
	ListBoxCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const ListBoxCollectionDescriptor = () =>
	defineComponent({
		ctor: TListBoxCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: ListBoxCollectionContribution(),
	})

export const ListBoxCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TListBoxItemCollectionFacade,
		contribution: ListBoxCollectionItemContribution(),
	})
