/**
 * Дескриптор TabsItem.
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, closable + коллекционный плагин (active, order).
 */

import { defineComponent, defineDescriptor } from '../../../define'
import { TTabsItem } from '@soldy/core'
import type { ITabsItemProps, TTabsItemEvents } from '@soldy/core'
import { TabsItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const TabsItemDescriptor = defineDescriptor(() =>
	defineComponent<ITabsItemProps, TTabsItemEvents>()({
		ctor: TTabsItem,

		extends: ValueControlDescriptor(),

		contribution: TabsItemContribution(),
	}),
)
