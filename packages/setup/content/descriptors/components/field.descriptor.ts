/**
 * Дескриптор Field (TField) — поле ввода, общая база Input и DateInput.
 *
 * Наследует InputControlDescriptor (value, name, readonly, required, id,
 * disabled, focused, size, variant, ...) и добавляет кнопку очистки: признак
 * `clearable`, слово `clearLabel`, имя кнопки `clearAria` и слот `clear`.
 * Саму кнопку рисует разметка формы — у конца поля, первой в слоте
 * `trailing`. Select своей кнопки не рисует: `clearable` и `clearLabel` он
 * отдаёт полю.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TField } from '@soldy-ui/core'
import { InputControlDescriptor } from './input-control.descriptor'

export const FieldDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TField,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * Своя кнопка очистки вместо встроенной — целиком, и рисуется, когда
			 * задана, без `clearable`. Scope — команда поля `clear`, привязанная к
			 * инстансу: кнопка зовёт её голой функцией.
			 */
			slots: {
				clear: {
					scope: { clear: defineType<() => void>(Function) },
					description: 'Кнопка очистки значения',
				},
			},
			props: {
				clearable: { type: Boolean, triggers: ['change:clearable'] },
				clearLabel: { type: String, triggers: ['change:clearLabel'] },
				/**
				 * Имя кнопки очистки — со словом `clearLabel` и именем поля.
				 * Отдельный набор, а не часть `aria`: `aria` описывает само поле, а
				 * это соседняя кнопка.
				 */
				clearAria: {
					type: Object,
					protected: true,
					triggers: ['change:clearLabel', 'change:name'],
				},
			},
		},
	}),
)
