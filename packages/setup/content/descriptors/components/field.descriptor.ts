/**
 * Дескриптор Field (TField) — поле ввода, общая база Input и DateInput.
 *
 * Наследует InputControlDescriptor (value, name, readonly, required, id,
 * disabled, focused, size, variant, ...) и добавляет кнопку очистки: признак
 * `clearable`, имя кнопки `clearAria`, слот `clear` и плагин словаря — имя
 * кнопки собирается из строки словаря приложения и имени поля. Саму кнопку
 * рисует разметка формы — у конца поля, первой в слоте `trailing`. Select
 * своей кнопки не рисует: `clearable` он отдаёт полю, а словарь полю пишет
 * его же плагин.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TField } from '@soldy-ui/core'
import { TranslationsPluginDescriptor } from '../plugins'
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
				/**
				 * Имя кнопки очистки — строка словаря с именем поля. Отдельный
				 * набор, а не часть `aria`: `aria` описывает само поле, а это
				 * соседняя кнопка.
				 */
				clearAria: {
					type: Object,
					protected: true,
					triggers: ['change:translations', 'change:name'],
				},
			},
		},

		plugins: [
			// Словарь приложения: имя кнопки очистки — с первой отрисовки
			TranslationsPluginDescriptor,
		],
	}),
)
