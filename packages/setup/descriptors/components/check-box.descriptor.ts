/**
 * Дескриптор CheckBox (TCheckBox).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет indeterminate, plain + плагин InputBool.
 */

import { defineComponent, definePlugin } from '../base'
import { TCheckBox } from '@soldy/core'
import { TInputBoolPlugin } from '@soldy/plugins'
import { CheckBoxContribution } from '../../contributions'
import { InputControlDescriptor } from './input-control.descriptor'

export const CheckBoxDescriptor = defineComponent({
	ctor: TCheckBox,

	extends: InputControlDescriptor,

	contribution: CheckBoxContribution,

	plugins: [
		definePlugin({
			ctor: TInputBoolPlugin,
		}),
	],
})
