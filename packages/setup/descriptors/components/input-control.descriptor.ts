/**
 * Дескриптор InputControl (TInputControl).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет readonly, required.
 */

import { defineComponent, defineDescriptor } from '../../define'
import { TInputControl } from '@soldy/core'
import { ValueControlDescriptor } from './value-control.descriptor'

export const InputControlDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TInputControl,

		extends: ValueControlDescriptor(),

		contribution: {
			props: {
				readonly: { type: Boolean, triggers: ['change:readonly'] },
				required: { type: Boolean, triggers: ['change:required'] },
				/**
				 * `id` элемента формы. Пусто — ядро берёт `uid`, поэтому проп можно не
				 * задавать; задают там, где на поле ссылаются `<label for>` или
				 * `aria-labelledby`.
				 */
				id: { type: String, triggers: ['change:id'] },
			},
		},
	}),
)
