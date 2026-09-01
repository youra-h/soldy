import { defineComponent } from '../../base'
import { TTabsCollectionFacade, TTabItemCollectionFacade } from '@soldy/core'
import { TabsCollectionContribution, TabsCollectionItemContribution } from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const TabsCollectionDescriptor = () =>
	defineComponent({
		ctor: TTabsCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: TabsCollectionContribution(),
	})

export const TabsCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TTabItemCollectionFacade,
		contribution: TabsCollectionItemContribution(),
	})
