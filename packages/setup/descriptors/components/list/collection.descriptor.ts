import { defineComponent } from '../../base'
import { TListCollectionFacade, TListItemCollectionFacade } from '@soldy/core'
import { ListCollectionContribution, ListCollectionItemContribution } from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const ListCollectionDescriptor = () =>
	defineComponent({
		ctor: TListCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: ListCollectionContribution(),
	})

export const ListCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TListItemCollectionFacade,
		contribution: ListCollectionItemContribution(),
	})
