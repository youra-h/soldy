/**
 * Дескриптор CheckBox (TCheckBox).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет indeterminate, plain + плагин InputBool.
 */

import { defineComponent } from '../base'
import { TCheckBox } from '@soldy/core'
import type { ICheckBoxProps, TCheckBoxEvents } from '@soldy/core'
import { InputBoolPluginDescriptor } from '../plugins'
import { CheckBoxContribution } from '../../contributions'
import { InputControlDescriptor } from './input-control.descriptor'

export const CheckBoxDescriptor = () =>
	defineComponent<ICheckBoxProps, TCheckBoxEvents>()({
		ctor: TCheckBox,

		extends: InputControlDescriptor(),

		contribution: CheckBoxContribution(),

		plugins: [InputBoolPluginDescriptor()],
	})
