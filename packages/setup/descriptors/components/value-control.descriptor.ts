/**
 * Дескриптор ValueControl (TValueControl).
 *
 * Наследует ControlDescriptor (disabled, focused, size, variant, ...)
 * и добавляет value, name.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TValueControl } from '@soldy/core'
import type { IValueControlProps, TValueControlEvents } from '@soldy/core'
import { ValueControlContribution } from '../../contributions'
import { ControlDescriptor } from './control.descriptor'

export const ValueControlDescriptor = defineDescriptor(() =>
	defineComponent<IValueControlProps<any>, TValueControlEvents<any>>()({
		ctor: TValueControl,

		extends: ControlDescriptor(),

		contribution: ValueControlContribution(),
	}),
)
