/**
 * Дескриптор TabItemCustom (TTabItemCustom).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет tag, text, closable.
 */

import { defineComponent } from '../../base'
import { TTabItemCustom } from '@soldy/core'
import { TabItemCustomContribution } from '../../../contributions/components/tab-item-custom'
import { ValueControlDescriptor } from '../value-control.descriptor'

export const TabItemCustomDescriptor = defineComponent({
	ctor: TTabItemCustom,

	extends: ValueControlDescriptor,

	contribution: TabItemCustomContribution,
})
