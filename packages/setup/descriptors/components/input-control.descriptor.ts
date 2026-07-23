/**
 * Дескриптор InputControl (TInputControl).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет readonly, required.
 */

import { defineComponent } from '../base'
import { TInputControl } from '@soldy/core'
import { InputControlContribution } from '../../contributions'
import { ValueControlDescriptor } from './value-control.descriptor'

export const InputControlDescriptor = defineComponent({
	ctor: TInputControl,

	extends: ValueControlDescriptor,

	contribution: InputControlContribution,
})
