/**
 * Дескриптор ValueControl (TValueControl).
 *
 * Наследует ControlDescriptor (disabled, focused, size, variant, ...)
 * и добавляет value, name.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TValueControl } from '@soldy/core'
import type { IValueControlProps, TValueControlEvents } from '@soldy/core'
import { ControlDescriptor } from './control.descriptor'

export const ValueControlDescriptor = defineDescriptor(() =>
	defineComponent<IValueControlProps<any>, TValueControlEvents<any>>()({
		ctor: TValueControl,

		extends: ControlDescriptor(),

		contribution: {
			props: {
				value: {
					type: [String, Number, Boolean, Object, Array],
					triggers: ['change:value'],
				},
				name: { type: String, triggers: ['change:name'] },
			},
			events: ['input', 'input:value'],
		},
	}),
)
