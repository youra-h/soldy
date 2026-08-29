import { TOrderExtension } from '@soldy/core'
import {
	OrderExtensionContribution,
	OrderItemExtensionContribution,
} from '../../../../contributions'
import { defineExtension } from '../../../base'

export const OrderExtensionDescriptor = () =>
	defineExtension({
		name: 'order',
		ctor: TOrderExtension,
		contribution: OrderExtensionContribution(),
		itemContribution: OrderItemExtensionContribution(),
	})
