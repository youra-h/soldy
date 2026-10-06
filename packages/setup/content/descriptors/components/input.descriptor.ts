/**
 * Дескриптор Input (TInput).
 *
 * Наследует FieldDescriptor (кнопка очистки — clearable, clearLabel, clearAria,
 * слот `clear` — поверх readonly, required, value, name, disabled, focused,
 * size, variant, ...) и добавляет placeholder, слоты `leading` и `trailing` +
 * плагины input-control, input.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TInput } from '@soldy-ui/core'
import type { IInput } from '@soldy-ui/core'
import { InputControlPluginDescriptor, InputPluginDescriptor } from '../plugins'
import { FieldDescriptor } from './field.descriptor'

export const InputDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TInput,

		extends: FieldDescriptor(),

		contribution: {
			/**
			 * Слоты стоят по сторонам поля, а не внутри него: `<input>` детей не
			 * имеет. Содержимое получает сам инстанс поля — кнопке рядом с
			 * полем нужны его значение и методы. Кнопка очистки стоит в обёртке
			 * `trailing` перед его содержимым.
			 */
			slots: {
				leading: {
					scope: { ctrl: defineType<IInput>(Object) },
					description: 'Перед полем ввода',
				},
				trailing: {
					scope: { ctrl: defineType<IInput>(Object) },
					description: 'После поля ввода и кнопки очистки',
				},
			},
			props: {
				placeholder: { type: String, triggers: ['change:placeholder'] },
			},
		},

		plugins: [InputControlPluginDescriptor, InputPluginDescriptor],
	}),
)
