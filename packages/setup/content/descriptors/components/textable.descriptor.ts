/**
 * Дескриптор Textable (TTextable).
 *
 * Наследует ControlDescriptor (disabled, focused, size, variant, ...)
 * и добавляет text.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TTextable } from '@soldy-ui/core'
import { ControlDescriptor } from './control.descriptor'

export const TextableDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TTextable,

		extends: ControlDescriptor(),

		contribution: {
			props: {
				text: { type: String, triggers: ['change:text'] },
			},
		},
	}),
)
