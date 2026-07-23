/**
 * Дескриптор Button (TButton).
 *
 * Наследует TextableDescriptor (text, disabled, focused, size, variant, ...)
 * и добавляет view.
 */

import { defineComponent } from '../base'
import { TButton } from '@soldy/core'
import { ButtonContribution } from '../../contributions'
import { TextableDescriptor } from './textable.descriptor'

export const ButtonDescriptor = defineComponent({
	ctor: TButton,

	extends: TextableDescriptor,

	contribution: ButtonContribution,
})
