/**
 * Дескриптор ValueControl (TValueControl).
 *
 * Наследует ControlDescriptor (disabled, focused, size, variant, ...)
 * и добавляет value, name.
 */

import { defineComponent } from '../base'
import { TValueControl } from '@soldy/core'
import { ValueControlContribution } from '../../contributions'
import { ControlDescriptor } from './control.descriptor'

export const ValueControlDescriptor = defineComponent({
	ctor: TValueControl,

	extends: ControlDescriptor,

	contribution: ValueControlContribution,
})
