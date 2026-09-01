import { defineComponent } from '../../base'
import { TCollapseCollectionFacade, TCollapseItemCollectionFacade } from '@soldy/core'
import {
	CollapseCollectionContribution,
	CollapseCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const CollapseCollectionDescriptor = () =>
	defineComponent({
		ctor: TCollapseCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: CollapseCollectionContribution(),
	})

export const CollapseCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TCollapseItemCollectionFacade,
		contribution: CollapseCollectionItemContribution(),
	})
