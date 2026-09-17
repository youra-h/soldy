import { defineComponent } from '../../../define'
import { TTabsCollectionFacade, TTabsItemCollectionFacade } from '@soldy/core'
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
		ctor: TTabsItemCollectionFacade,
		contribution: TabsCollectionItemContribution(),
	})
