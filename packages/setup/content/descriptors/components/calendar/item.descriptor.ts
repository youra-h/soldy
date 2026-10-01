/**
 * Дескриптор CalendarItem (TCalendarItem) — день календаря.
 *
 * Наследует `StylableDescriptor`, а не `ControlDescriptor`: плагины Control
 * дню не подходят. `TAriaPlugin` при установке снимает `aria-label`, а имя дня
 * — полную дату — пишет вид календаря; `TActionPlugin` дал бы второй путь к
 * выбору рядом с плагинами владельца, которые переводят нажатия и клавиши в
 * команды коллекции.
 *
 * Входов у дня нет: дату и номер кладёт в коллекцию вид календаря,
 * «выключен» и «недоступен» — итог своего и входов от расширений, размер и вариант
 * — календаря. Всё это только читается, поэтому объявлено защищённым.
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TCalendarItem } from '@soldy-ui/core'
import { OWNER_STYLE_PROPS, StylableDescriptor } from '../stylable.descriptor'

export const CalendarItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TCalendarItem,

		extends: StylableDescriptor(),

		contribution: {
			slots: {
				default: {
					scope: { text: defineType<string>(String) },
					description: 'Содержимое дня. Без него — номер дня в цифрах локали',
				},
			},
			props: {
				// Размер и вариант дня — календаря: входы сняты
				...OWNER_STYLE_PROPS,
				disabled: { type: Boolean, protected: true, triggers: ['change:disabled'] },
				focused: { type: Boolean, protected: true, triggers: ['change:focused'] },
				date: { type: String, protected: true, triggers: ['change:date'] },
				text: { type: String, protected: true, triggers: ['change:text'] },
				unavailable: { type: Boolean, protected: true, triggers: ['change:unavailable'] },
			},
		},
	}),
)
