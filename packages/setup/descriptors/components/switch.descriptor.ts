/**
 * Дескриптор Switch (TSwitch).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет плагин InputBool.
 */

import { defineComponent, definePlugin } from '../base'
import { TSwitch } from '@soldy/core'
import { TInputBoolPlugin } from '@soldy/plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const SwitchDescriptor = defineComponent({
	ctor: TSwitch,

	extends: InputControlDescriptor,

	plugins: [
		definePlugin({
			ctor: TInputBoolPlugin,
		}),
	],
})
