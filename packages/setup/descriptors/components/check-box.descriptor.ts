/**
 * Дескриптор CheckBox (TCheckBox).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет indeterminate, view + плагин InputBool.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TCheckBox } from '@soldy/core'
import type { ICheckBoxProps, TCheckBoxEvents } from '@soldy/core'
import { InputBoolPluginDescriptor } from '../plugins'
import { CheckBoxContribution } from '../../contributions'
import { InputControlDescriptor } from './input-control.descriptor'

export const CheckBoxDescriptor = defineDescriptor(() =>
	defineComponent<ICheckBoxProps, TCheckBoxEvents>()({
		ctor: TCheckBox,

		extends: InputControlDescriptor(),

		contribution: CheckBoxContribution(),

		plugins: [InputBoolPluginDescriptor()],
	}),
)
