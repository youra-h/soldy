/**
 * Дескриптор Input (TInput).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет placeholder + плагины input-control, input.
 */

import { defineComponent } from '../base'
import { TInput } from '@soldy/core'
import type { IInputProps, TInputEvents } from '@soldy/core'
import { InputControlPluginDescriptor, InputPluginDescriptor } from '../plugins'
import { InputContribution } from '../../contributions'
import { InputControlDescriptor } from './input-control.descriptor'

export const InputDescriptor = () =>
	defineComponent<IInputProps, TInputEvents>()({
		ctor: TInput,

		extends: InputControlDescriptor(),

		contribution: InputContribution(),

		plugins: [InputControlPluginDescriptor(), InputPluginDescriptor()],
	})
