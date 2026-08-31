import { defineComponent } from '../../base'
import {
	TTabsCollectionFacade,
	TTabItemCollectionFacade,
} from '@soldy/core'
import {
	TabsCollectionContribution,
	TabsCollectionItemContribution,
} from '../../../contributions'

export const TabsCollectionDescriptor = () =>
	defineComponent({
		ctor: TTabsCollectionFacade,
		contribution: TabsCollectionContribution(),
	})

export const TabsCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TTabItemCollectionFacade,
		contribution: TabsCollectionItemContribution(),
	})
