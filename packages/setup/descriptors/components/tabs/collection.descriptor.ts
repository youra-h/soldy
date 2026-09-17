import { defineComponent, defineDescriptor } from '../../../define'
import { TTabsCollectionFacade, TTabsItemCollectionFacade } from '@soldy/core'
import { TabsCollectionContribution, TabsCollectionItemContribution } from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const TabsCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: TabsCollectionContribution(),
	}),
)

export const TabsCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTabsItemCollectionFacade,
		contribution: TabsCollectionItemContribution(),
	}),
)
