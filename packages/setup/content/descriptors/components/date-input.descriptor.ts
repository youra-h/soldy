/**
 * Дескриптор DateInput (TDateInput).
 *
 * Наследует `InputControlDescriptor` (value, name, readonly, required, id,
 * disabled, size, variant, ...) и добавляет границы и локаль формата. Дата
 * вводится по частям в формате локали, а вся она выделяется, копируется и
 * удаляется, как текст: на компьютере части нередактируемые, их клавиши,
 * указатель и буфер обмена переводят в команды ядра плагины поля. Касание
 * пальцем или пером делает части редактируемыми — для экранной клавиатуры
 * (сенсорный плагин).
 *
 * Разметка: корень — группа (`role="group"`, имя — `aria_label` или
 * `aria_labelledBy`), в нём ряд частей — `spinbutton` с остановкой Tab у
 * каждой — и скрытое поле формы. См. AGENTS.md, «Даты» и «Готовые паттерны».
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TDateInput } from '@soldy-ui/core'
import type { IDateInput } from '@soldy-ui/core'
import {
	DateInputClipboardPluginDescriptor,
	DateInputIdsPluginDescriptor,
	DateInputKeyboardPluginDescriptor,
	DateInputPointerPluginDescriptor,
	DateInputTouchPluginDescriptor,
} from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const DateInputDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDateInput,

		extends: InputControlDescriptor(),

		contribution: {
			/**
			 * Слоты стоят по сторонам ряда частей, как у Input: в `trailing`
			 * DatePicker ставит кнопку календаря. Содержимое получает сам инстанс
			 * поля — кнопке рядом нужны его значение и команды.
			 */
			slots: {
				leading: {
					scope: { ctrl: defineType<IDateInput>(Object) },
					description: 'Перед датой',
				},
				trailing: {
					scope: { ctrl: defineType<IDateInput>(Object) },
					description: 'После даты: кнопка календаря',
				},
			},
			props: {
				/** Дата строкой `YYYY-MM-DD`: другого значения у поля нет. */
				value: { type: String },
				min: { type: String, triggers: ['change:min'] },
				max: { type: String, triggers: ['change:max'] },
				locale: { type: String, triggers: ['change:locale'] },
				/**
				 * Части и разделители в порядке формата. Перечитываются на правку
				 * частей и наборов частей (`change:segments`) и на всё, что пишет
				 * их наборы ядро: локаль — текст, имена и порядок, `disabled` —
				 * остановки Tab, `readonly` и `required` — `aria-readonly` и
				 * `aria-required`, границы — `aria-invalid`.
				 */
				segments: {
					type: Array,
					protected: true,
					triggers: [
						'change:segments',
						'change:locale',
						'change:disabled',
						'change:readonly',
						'change:required',
						'change:min',
						'change:max',
					],
				},
				/** `dir` и `lang` ряда частей — по формату локали. */
				segmentsAttrs: { type: Object, protected: true, triggers: ['change:locale'] },
			},
		},

		plugins: [
			// Клавиши частей и DOM-фокус за частью под фокусом ядра
			DateInputKeyboardPluginDescriptor,
			// Нажатие мимо частей и контекстное меню над рядом
			DateInputPointerPluginDescriptor,
			// Копирование, вырезание, вставка и перетаскивание даты текстом
			DateInputClipboardPluginDescriptor,
			// Касание делает части редактируемыми для экранной клавиатуры, её
			// правку переводит в команды ядра. После плагина указателя: правку
			// ряда, ставшего редактируемым ради контекстного меню, гасит он
			DateInputTouchPluginDescriptor,
			// `id` частей — от монтирования: по нему часть ссылается на себя
			DateInputIdsPluginDescriptor,
		],
	}),
)
