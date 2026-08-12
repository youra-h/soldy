import { mergeCollectionContributions } from '../../descriptors/base'
import { EngineContribution } from '../extensions/engine'
import { ActivationContribution } from '../extensions/activation'
import { BatchEventsContribution } from '../extensions/batch'
import { TabsItemExtensionContribution } from '../custom/tabs'
import { ActivationItemContribution } from '../extensions/activation'
import { OrderItemContribution } from '../extensions/order'

/** Props и events коллекции для родительского компонента Tabs */
export const TabsCollectionContribution = mergeCollectionContributions(
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
