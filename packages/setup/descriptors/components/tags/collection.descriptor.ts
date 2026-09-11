import { defineComponent } from '../../base'
import { TTagsCollectionFacade, TTagsItemCollectionFacade } from '@soldy/core'
import { TagsCollectionContribution, TagsCollectionItemContribution } from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const TagsCollectionDescriptor = () =>
	defineComponent({
		ctor: TTagsCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: TagsCollectionContribution(),
	})

export const TagsCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TTagsItemCollectionFacade,

		contribution: TagsCollectionItemContribution(),
	})
