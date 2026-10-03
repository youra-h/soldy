/**
 * Дескриптор DateInput (TDateInput).
 *
 * Наследует `InputControlDescriptor` (value, name, readonly, required, id,
 * disabled, size, variant, ...) и добавляет границы, локаль формата и точность:
 * дата или дата со временем. Значение вводится по частям в формате локали, а
 * всё оно выделяется, копируется и удаляется, как текст: части нередактируемые,
 * их клавиши, указатель и буфер обмена переводят в команды ядра три плагина
 * поля.
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
	DateInputKeyboardPluginDescriptor,
	DateInputPointerPluginDescriptor,
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
				/**
				 * Строкой: дата `YYYY-MM-DD` или, с точностью до минуты, дата со
				 * временем `YYYY-MM-DDTHH:mm`. Другого значения у поля нет.
				 */
				value: { type: String },
				min: { type: String, triggers: ['change:min'] },
				max: { type: String, triggers: ['change:max'] },
				locale: { type: String, triggers: ['change:locale'] },
				/** `day` — дата, `minute` — ещё час, минута и период суток по циклу локали. */
				granularity: { type: String, triggers: ['change:granularity'] },
				/**
				 * Части и разделители в порядке формата. Перечитываются на правку
				 * частей и на всё, что пишет их наборы: локаль и точность — текст,
				 * имена, порядок и состав частей, `disabled` — остановки Tab,
				 * `readonly` и `required` — `aria-readonly` и `aria-required`,
				 * границы — `aria-invalid`.
				 */
				segments: {
					type: Array,
					protected: true,
					triggers: [
						'change:segments',
						'change:locale',
						'change:granularity',
						'change:disabled',
						'change:readonly',
						'change:required',
						'change:min',
						'change:max',
					],
				},
				/** `dir` и `lang` ряда частей — по формату локали в точности поля. */
				segmentsAttrs: {
					type: Object,
					protected: true,
					triggers: ['change:locale', 'change:granularity'],
				},
			},
		},

		plugins: [
			// Клавиши частей и DOM-фокус за частью под фокусом ядра
			DateInputKeyboardPluginDescriptor,
			// Нажатие мимо частей и контекстное меню над рядом
			DateInputPointerPluginDescriptor,
			// Копирование, вырезание, вставка и перетаскивание даты текстом
			DateInputClipboardPluginDescriptor,
		],
	}),
)
