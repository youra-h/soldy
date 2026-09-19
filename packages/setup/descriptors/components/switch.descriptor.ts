/**
 * Дескриптор Switch (TSwitch).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет плагин InputBool.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TSwitch } from '@soldy/core'
import { InputBoolPluginDescriptor } from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const SwitchDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TSwitch,

		extends: InputControlDescriptor(),

		plugins: [InputBoolPluginDescriptor()],
	}),
)
