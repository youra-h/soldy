/**
 * Дескриптор Field (TField) — поле ввода, общая база Input и DateInput.
 *
 * Наследует InputControlDescriptor (value, name, readonly, required, id,
 * disabled, focused, size, variant, ...) и добавляет кнопку очистки: признак
 * `clearable`, набор кнопки `clearAria`, слот `clear` и плагин имён — имя
 * кнопки собирается из шаблона локали и имени поля. Саму кнопку рисует
 * разметка формы — у конца поля, первой в слоте `trailing`. Select своей
 * кнопки не рисует: `clearable` он отдаёт полю, а имя кнопке пишет плагин
 * имён самого поля.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TField } from '@soldy-ui/core'
import { FieldNamesPluginDescriptor } from '../plugins'
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
				 * Набор кнопки очистки: отдельный, а не часть `aria` — `aria`
				 * описывает само поле, а это соседняя кнопка. Имя с именем поля в
				 * него пишет `TFieldNamesPlugin`.
				 */
				clearAria: { type: Object, protected: true, triggers: ['change:clearAria'] },
			},
		},

		plugins: [
			// Имя кнопки очистки от локали — с первой отрисовки
			FieldNamesPluginDescriptor,
		],
	}),
)
