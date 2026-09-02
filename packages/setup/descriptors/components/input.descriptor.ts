/**
 * Дескриптор Input (TInput).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет placeholder + плагины input-control, input.
 */

import { defineComponent, definePlugin } from '../base'
import { TInput } from '@soldy/core'
import { TInputControlPlugin, TInputPlugin } from '@soldy/plugins'
import { InputContribution } from '../../contributions'
import { InputControlDescriptor } from './input-control.descriptor'

export const InputDescriptor = defineComponent({
	ctor: TInput,

	extends: InputControlDescriptor,

	contribution: InputContribution,

	plugins: [
		definePlugin({
			ctor: TInputControlPlugin,
		}),
		definePlugin({
			ctor: TInputPlugin,
		}),
	],
})
