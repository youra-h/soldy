/**
 * Дескриптор Input (TInput).
 *
 * Наследует FieldDescriptor (кнопка очистки — clearable, clearAria — поверх
 * readonly, required, value, name, disabled, focused, size, variant, ...) и
 * добавляет placeholder, слоты `leading`, `clear` и `trailing` + плагины имён,
 * input-control, input.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TInput } from '@soldy-ui/core'
import type { IInput } from '@soldy-ui/core'
import {
	FieldNamesPluginDescriptor,
	InputControlPluginDescriptor,
	InputPluginDescriptor,
} from '../plugins'
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
			 *
			 * Своя кнопка очистки (`clear`) заменяет встроенную целиком и
			 * рисуется, когда задана, без `clearable`. Scope — команда поля
			 * `clear`, привязанная к инстансу: кнопка зовёт её голой функцией.
			 */
			slots: {
				leading: {
					scope: { ctrl: defineType<IInput>(Object) },
					description: 'Перед полем ввода',
				},
				clear: {
					scope: { clear: defineType<() => void>(Function) },
					description: 'Кнопка очистки значения',
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

		plugins: [
			// Имя кнопки очистки от локали — с первой отрисовки
			FieldNamesPluginDescriptor,
			InputControlPluginDescriptor,
			InputPluginDescriptor,
		],
	}),
)
