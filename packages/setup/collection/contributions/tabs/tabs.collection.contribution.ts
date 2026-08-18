import { mergeCollectionContributions } from '../../descriptors/base'
import { CollectionBaseContribution } from '../base'
import { EngineContribution } from '../extensions/engine'
import { ActivationContribution } from '../extensions/activation'
import { ActivationItemContribution } from '../extensions/activation'
import { BatchEventsContribution } from '../extensions/batch'
import { OrderItemContribution } from '../extensions/order'
import { TabsItemExtensionContribution } from '../custom/tabs'

/** Props и events коллекции для родительского компонента Tabs */
export const TabsCollectionContribution = mergeCollectionContributions(
	CollectionBaseContribution,
	EngineContribution,
	ActivationContribution,
	BatchEventsContribution,
)

/** Props и events для дочернего элемента TabItem */
export const TabsCollectionItemContribution = mergeCollectionContributions(
	ActivationItemContribution,
	OrderItemContribution,
	TabsItemExtensionContribution,
)
