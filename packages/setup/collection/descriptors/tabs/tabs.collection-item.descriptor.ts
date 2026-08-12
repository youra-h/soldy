import { defineCollectionItem } from '../base'
import { TabsCollectionItemContribution } from '../../../contributions/tabs'

export const TabsCollectionItemDescriptor = defineCollectionItem({
	contribution: TabsCollectionItemContribution,
})
