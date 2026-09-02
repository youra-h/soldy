import { defineComponent } from '../../base'
import { TListBoxCollectionFacade, TListBoxItemCollectionFacade } from '@soldy/core'
import {
	ListBoxCollectionContribution,
	ListBoxCollectionItemContribution,
} from '../../../contributions'
import { ListCollectionDescriptor, ListCollectionItemDescriptor } from '../list'

export const ListBoxCollectionDescriptor = () =>
	defineComponent({
		ctor: TListBoxCollectionFacade,

		extends: ListCollectionDescriptor(),

		contribution: ListBoxCollectionContribution(),
	})

export const ListBoxCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TListBoxItemCollectionFacade,

		extends: ListCollectionItemDescriptor(),

		contribution: ListBoxCollectionItemContribution(),
	})
