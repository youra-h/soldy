/**
 * Дескриптор InputControl (TInputControl).
 *
 * Наследует ValueControlDescriptor (value, name, disabled, focused, size, variant, ...)
 * и добавляет readonly, required и `id` поля.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TInputControl } from '@soldy-ui/core'
import { ValueControlDescriptor } from './value-control.descriptor'
import { IdPluginDescriptor } from '../plugins'

export const InputControlDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TInputControl,

		extends: ValueControlDescriptor(),

		contribution: {
			props: {
				readonly: { type: Boolean, triggers: ['change:readonly'] },
				required: { type: Boolean, triggers: ['change:required'] },
			},
		},

		plugins: [
			// `id` поля — проп `id`: на поле ссылаются `<label for>` и
			// `aria-labelledby` разметки и `for` подписи `Field`. Не задан —
			// атрибута нет; шаблон кладёт его на само поле, а не на корень
			IdPluginDescriptor,
		],
	}),
)
