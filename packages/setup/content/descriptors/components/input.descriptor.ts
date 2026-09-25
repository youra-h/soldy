/**
 * Дескриптор Input (TInput).
 *
 * Наследует InputControlDescriptor (readonly, required, value, name, disabled, focused, size, variant, ...)
 * и добавляет placeholder, слоты `leading` и `trailing` + плагины input-control, input.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TInput } from '@soldy-ui/core'
import type { IInput } from '@soldy-ui/core'
import { InputControlPluginDescriptor, InputPluginDescriptor } from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const InputDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TInput,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * Слоты стоят по сторонам поля, а не внутри него: `<input>` детей не
			 * имеет. Содержимое получает сам инстанс поля — кнопке рядом с
			 * полем нужны его значение и методы.
			 */
			slots: {
				leading: {
					scope: { ctrl: defineType<IInput>(Object) },
					description: 'Перед полем ввода',
				},
				trailing: {
					scope: { ctrl: defineType<IInput>(Object) },
					description: 'После поля ввода',
				},
			},
			props: {
				placeholder: { type: String, triggers: ['change:placeholder'] },
			},
		},

		plugins: [InputControlPluginDescriptor, InputPluginDescriptor],
	}),
)
