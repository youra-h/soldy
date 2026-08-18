import { defineCollectionItem } from '../base'
import { ActivationItemExtensionDescriptor } from '../extensions/activation'
import { OrderItemExtensionDescriptor } from '../extensions/order'
import { TabsItemExtensionDescriptor } from '../custom/tabs'

export const TabsCollectionItemDescriptor = defineCollectionItem({
	extensions: [
		ActivationItemExtensionDescriptor,
		OrderItemExtensionDescriptor,
		TabsItemExtensionDescriptor,
	],
})
