/**
 * Дескриптор TabItem.
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, closable + коллекционный плагин (active, order).
 */

import { defineComponent, definePlugin } from '../../base'
import { TTabItem } from '@soldy/core'
import { TCollectionItemPlugin } from '@soldy/plugins'
import { TabItemContribution, ActivationItemExtensionContribution, OrderItemExtensionContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const TabItemDescriptor = defineComponent({
	ctor: TTabItem,

	extends: ValueControlDescriptor,

	contribution: TabItemContribution,

	plugins: [
		definePlugin({
			ctor: TCollectionItemPlugin,
			contribution: [
				ActivationItemExtensionContribution,
				OrderItemExtensionContribution,
			],
		}),
	],
})
