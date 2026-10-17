/**
 * Дескриптор Clearable (TClearable) — очистка значения, общая база Input,
 * DateInput и DatePicker.
 *
 * Наследует InputControlDescriptor (value, name, readonly, required, id,
 * disabled, focused, size, variant, ...) и добавляет кнопку очистки: признак
 * `clearable` и набор кнопки `clearAria`. Саму кнопку рисует разметка формы:
 * Input и DateInput — у конца поля, первой в слоте `trailing`, DatePicker — у
 * одной даты в слоте `clear` своего поля, у диапазона — одну на период, после
 * поля конца. Select своей кнопки не рисует: `clearable` он отдаёт полю.
 *
 * Слот `clear` — своя кнопка вместо встроенной — объявляет каждая форма сама:
 * своей разметки у базы нет ни в одном адаптере, а слоты не наследуются.
 *
 * Плагина имён у базы нет, как у модального слоя: плагин имён у компонента
 * один, а у DatePicker кнопок с именами больше. Имя кнопки очистки пишет
 * плагин имён формы — `TClearableNamesPlugin` у Input и DateInput, его
 * наследник `TDatePickerNamesPlugin` у DatePicker.
 */

import { defineComponent, defineDescriptor } from '../../../protected/define'
import { TClearable } from '@soldy-ui/core'
import { InputControlDescriptor } from './input-control.descriptor'

export const ClearableDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TClearable,

		extends: InputControlDescriptor(),

		contribution: {
			props: {
				clearable: { type: Boolean, triggers: ['change:clearable'] },
				/**
				 * Набор кнопки очистки: отдельный, а не часть `aria` — `aria`
				 * описывает само поле, а это соседняя кнопка. Имя с именем поля в
				 * него пишет плагин имён формы.
				 */
				clearAria: { type: Object, protected: true, triggers: ['change:clearAria'] },
			},
		},
	}),
)
