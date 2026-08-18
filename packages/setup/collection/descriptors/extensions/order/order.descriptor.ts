import { defineCollectionExtension } from '../../base'
import { OrderItemContribution } from '../../../contributions/extensions/order'

/** order для элемента коллекции */
export const OrderItemExtensionDescriptor = defineCollectionExtension({
	source: 'order',
	contribution: OrderItemContribution,
})
