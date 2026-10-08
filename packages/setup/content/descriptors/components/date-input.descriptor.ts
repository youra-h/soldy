/**
 * Дескриптор DateInput (TDateInput).
 *
 * Наследует `FieldDescriptor` (кнопка очистки — clearable, clearAria, слот
 * `clear` — поверх value, name, readonly, required, id, disabled, size,
 * variant, ...) и добавляет границы и недоступные дни, вид поля — дата или
 * дата со временем — и точность времени: до минуты или до секунды. Язык
 * формата — тег локали поддерева: его пишет плагин языка, имя кнопки
 * очистки — плагин имён поля.
 * Значение вводится по частям в формате локали, а всё оно выделяется,
 * копируется и удаляется, как текст: на компьютере части нередактируемые, их
 * клавиши, указатель и буфер обмена переводят в команды ядра плагины поля.
 * Касание пальцем или пером делает части редактируемыми — для экранной
 * клавиатуры (сенсорный плагин).
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
	FieldNamesPluginDescriptor,
	LocalePluginDescriptor,
} from '../plugins'
import { FieldDescriptor } from './field.descriptor'

export const DateInputDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDateInput,

		extends: FieldDescriptor(),

		contribution: {
			/**
			 * Слоты стоят по сторонам ряда частей, как у Input: в `trailing`
			 * DatePicker ставит кнопку календаря. Содержимое получает сам инстанс
			 * поля — кнопке рядом нужны его значение и команды. Кнопка очистки
			 * стоит в обёртке `trailing` перед его содержимым.
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
				 * Строкой: дата `YYYY-MM-DD` или, у поля даты и времени, дата со
				 * временем `YYYY-MM-DDTHH:mm`, с точностью до секунды —
				 * `YYYY-MM-DDTHH:mm:ss`. Другого значения у поля нет.
				 */
				value: { type: String },
				min: { type: String, triggers: ['change:min'] },
				max: { type: String, triggers: ['change:max'] },
				/**
				 * Недоступные дни — та же функция, что у календаря: день значения,
				 * который она отвергает, поле помечает ошибкой, как дату вне
				 * границ. Зовётся без якоря.
				 */
				unavailable: { type: Function, triggers: ['change:unavailable'] },
				/**
				 * Язык формата — не вход: его задаёт приложение на всю библиотеку,
				 * и пишет плагин языка.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				/** `date` — дата, `datetime` — ещё час, минута и период суток по циклу локали. */
				kind: { type: String, triggers: ['change:kind'] },
				/** `minute` — время до минуты, `second` — ещё секунда. У поля даты ничего не меняет. */
				timePrecision: { type: String, triggers: ['change:timePrecision'] },
				/**
				 * Части и разделители в порядке формата. Перечитываются на правку
				 * частей и наборов частей (`change:segments`) и на всё, что пишет
				 * их наборы ядро: локаль, вид поля и точность времени — текст,
				 * имена, порядок и состав частей, `disabled` — остановки Tab,
				 * `readonly` и `required` — `aria-readonly` и `aria-required`,
				 * границы и недоступные дни — `aria-invalid`.
				 */
				segments: {
					type: Array,
					protected: true,
					triggers: [
						'change:segments',
						'change:locale',
						'change:kind',
						'change:timePrecision',
						'change:disabled',
						'change:readonly',
						'change:required',
						'change:min',
						'change:max',
						'change:unavailable',
					],
				},
				/** `dir` и `lang` ряда частей — по формату локали, виду поля и точности. */
				segmentsAttrs: {
					type: Object,
					protected: true,
					triggers: ['change:locale', 'change:kind', 'change:timePrecision'],
				},
			},
		},

		plugins: [
			// Имя кнопки очистки от локали — с первой отрисовки
			FieldNamesPluginDescriptor,
			// Язык приложения — до поведения частей: формат с первой отрисовки
			LocalePluginDescriptor,
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
