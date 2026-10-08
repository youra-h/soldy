/**
 * Дескриптор Calendar (TCalendar).
 *
 * Наследует `ValueControlDescriptor` (value, name, disabled, focused, size,
 * variant, ...) и добавляет то, что задаёт потребитель: границы, недоступные
 * дни, первый день недели, пояс «сегодня» и месяцы сеток. Язык и имена кнопок
 * — от локали поддерева: их пишут плагины языка и имён, а разметка получает
 * готовые выходы. Всё, что календарь делает с днями, —
 * коллекция и её расширения (`CalendarCollectionDescriptor`); клавиши и
 * указатель переводят в их команды плагины владельца.
 *
 * Сетка — по APG (Date Picker Dialog): фокус и наборы стоят на самой ячейке
 * дня, весь календарь — одна остановка Tab на все сетки, а заголовок месяца —
 * вежливая живая область. См. AGENTS.md, «Даты» и «Готовые паттерны».
 */

import { defineComponent, defineDescriptor, defineType } from '../../../../protected/define'
import { TCalendar } from '@soldy-ui/core'
import type { ICalendarItem } from '@soldy-ui/core'
import { ValueControlDescriptor } from '../value-control.descriptor'
import {
	CalendarIdsPluginDescriptor,
	CalendarKeyboardPluginDescriptor,
	CalendarPointerPluginDescriptor,
	CollectionBundlesPluginDescriptor,
	CollectionElementsPluginDescriptor,
	CalendarNamesPluginDescriptor,
	LocalePluginDescriptor,
} from '../../plugins'

export const CalendarDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TCalendar,

		extends: ValueControlDescriptor(),

		contribution: {
			/**
			 * Состав дней — не слот: их кладёт в коллекцию вид по месяцам сеток,
			 * и день из разметки попал бы в неё мимо вида. Поэтому `default`
			 * календарь не рисует, а содержимое дня — статический слот `item`,
			 * который получает день через scope (см. «Слоты элементов»).
			 */
			slots: {
				item: {
					scope: { item: defineType<ICalendarItem>(Object) },
					description: 'Содержимое дня: цена, точка события. Без него — номер дня',
				},
				// Подмена значков кнопок листания в одном месте; по умолчанию —
				// роль `arrowRight` у обеих, стрелку «назад» зеркалит тема
				'prev-icon': { description: 'Значок кнопки «предыдущий месяц»' },
				'next-icon': { description: 'Значок кнопки «следующий месяц»' },
			},
			props: {
				min: { type: String, triggers: ['change:min'] },
				max: { type: String, triggers: ['change:max'] },
				unavailable: { type: Function, triggers: ['change:unavailable'] },
				weekStart: { type: Number, triggers: ['change:weekStart'] },
				/**
				 * Язык подписей и первого дня недели — не вход: это тег локали
				 * поддерева, и пишет его плагин языка.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				timeZone: { type: String, triggers: ['change:timeZone'] },
				/**
				 * Месяц каждой сетки. Вид пишет сюда и те месяцы, что показал сам
				 * (листание, уход фокуса), поэтому у пропа есть `v-model:months`.
				 */
				months: { type: Array, triggers: ['change:months'] },
				/** Подписи колонок — от первого дня недели, на языке локали. */
				weekdays: {
					type: Array,
					protected: true,
					triggers: ['change:locale', 'change:weekStart'],
				},
				/**
				 * Наборы кнопок листания: своего экземпляра у кнопок нет, и наборы
				 * держит календарь. Имена в них — и в наборы стрелок панели выбора
				 * месяца и года, которые разметка получает выходом коллекции
				 * `pickers`, — пишет `TCalendarNamesPlugin`.
				 */
				prevAria: { type: Object, protected: true, triggers: ['change:prevAria'] },
				nextAria: { type: Object, protected: true, triggers: ['change:nextAria'] },
			},
		},

		plugins: [
			// Язык — до поведения: подписи с первой отрисовки
			LocalePluginDescriptor,
			// Коллекция: реестр bundles + доступ к DOM-узлам дней
			CollectionBundlesPluginDescriptor,
			CollectionElementsPluginDescriptor,
			// Клавиши сетки по APG и DOM-фокус за фокусом коллекции
			CalendarKeyboardPluginDescriptor,
			// Нажатия по дням и кнопкам листания, наведение для предпросмотра
			CalendarPointerPluginDescriptor,
			// Имена сеток: `id` заголовка месяца и ссылка сетки на него.
			// После реестра bundles: движок узнаёт от него
			CalendarIdsPluginDescriptor,
			// Имена кнопок листания и стрелок панели выбора от локали. После
			// реестра bundles: движок узнаёт от него
			CalendarNamesPluginDescriptor,
		],
	}),
)
