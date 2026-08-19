import { TOrderExtension } from '@soldy/core'
import { OrderExtensionContribution } from '../../../../contributions'

export const OrderExtensionDescriptor = () => defineExtension<TItem = object>({
	ctor: TOrderExtension<TItem>,

	contribution: OrderExtensionContribution,
})
