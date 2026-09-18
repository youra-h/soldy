/**
 * Дескриптор Input (TInput).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет placeholder + плагины input-control, input.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TInput } from '@soldy/core'
import type { IInputProps, TInputEvents } from '@soldy/core'
import { InputControlPluginDescriptor, InputPluginDescriptor } from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const InputDescriptor = defineDescriptor(() =>
	defineComponent<IInputProps, TInputEvents>()({
		ctor: TInput,

		extends: InputControlDescriptor(),

		contribution: {
			props: {
				placeholder: { type: String, triggers: ['change:placeholder'] },
			},
		},

		plugins: [InputControlPluginDescriptor(), InputPluginDescriptor()],
	}),
)
