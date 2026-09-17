import { defineComponent, defineDescriptor } from '../../../define'
import { TTagsCollectionFacade, TTagsItemCollectionFacade } from '@soldy/core'
import { TagsCollectionContribution, TagsCollectionItemContribution } from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const TagsCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTagsCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: TagsCollectionContribution(),
	}),
)

export const TagsCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTagsItemCollectionFacade,

		contribution: TagsCollectionItemContribution(),
	}),
)
