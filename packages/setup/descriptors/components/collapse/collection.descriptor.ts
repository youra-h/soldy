import { defineComponent } from '../../base'
import { TCollapseCollectionFacade, TCollapseItemCollectionFacade } from '@soldy/core'
import {
	CollapseCollectionContribution,
	CollapseCollectionItemContribution,
} from '../../../contributions'

export const CollapseCollectionDescriptor = () =>
	defineComponent({
		ctor: TCollapseCollectionFacade,
		contribution: CollapseCollectionContribution(),
	})

export const CollapseCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TCollapseItemCollectionFacade,
		contribution: CollapseCollectionItemContribution(),
	})
