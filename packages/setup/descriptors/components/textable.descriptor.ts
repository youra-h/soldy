/**
 * Дескриптор Textable (TTextable).
 *
 * Наследует ControlDescriptor (disabled, focused, size, variant, ...)
 * и добавляет text.
 */

import { defineComponent } from '../base'
import { TTextable } from '@soldy/core'
import type { ITextableProps, TTextableEvents } from '@soldy/core'
import { TextableContribution } from '../../contributions'
import { ControlDescriptor } from './control.descriptor'

export const TextableDescriptor = () =>
	defineComponent<ITextableProps, TTextableEvents>()({
		ctor: TTextable,

		extends: ControlDescriptor(),

		contribution: TextableContribution(),
	})
