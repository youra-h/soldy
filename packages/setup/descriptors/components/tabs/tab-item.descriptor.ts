/**
 * Дескриптор TabItem.
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, closable + коллекционный плагин (active, order).
 */

import { defineComponent } from '../../base'
import { TTabItem } from '@soldy/core'
import { TabItemContribution } from '../../../contributions'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const TabItemDescriptor = defineComponent({
	ctor: TTabItem,

	extends: ValueControlDescriptor,

	contribution: TabItemContribution,
})
