/**
 * Дескриптор DatePicker (TDatePicker).
 *
 * Наследует `InputControlDescriptor` (value, name, readonly, required, id,
 * disabled, size, variant, ...) и добавляет режим, открытость панели и то, что
 * DatePicker отдаёт полям и календарю: границы, недоступные дни, первый день
 * недели, локаль, пояс «сегодня» — имена кнопки и концов диапазона и имена
 * концов в форме.
 *
 * Поля (`field`, `start`, `end`), календарь и его движок — экземпляры ядра
 * DatePicker: разметка отдаёт их компонентам целиком (`:ctrl`, `:engine`), как
 * Select — поле. Пропсов календаря сверх перечисленных (подписи кнопок, месяцы
 * сеток) здесь нет: они у `ctrl.calendar`.
 *
 * Паттерн — APG Date Picker Dialog: поле и отдельная кнопка календаря, панель —
 * диалог, модальный для клавиатуры и скринридера, а нажатие мимо просто её
 * закрывает. См. AGENTS.md, «Даты» и «Готовые паттерны».
 */

import { defineComponent, defineDescriptor, defineType } from '../../../protected/define'
import { TDatePicker } from '@soldy-ui/core'
import type { ICalendarItem } from '@soldy-ui/core'
import {
	DatePickerFocusPluginDescriptor,
	DatePickerIdsPluginDescriptor,
	DatePickerTriggerPluginDescriptor,
	DismissPluginDescriptor,
	HideOutsidePluginDescriptor,
} from '../plugins'
import { InputControlDescriptor } from './input-control.descriptor'

export const DatePickerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDatePicker,

		extends: InputControlDescriptor(),

		contribution: {
			slots: {
				'trigger-icon': { description: 'Значок кнопки календаря' },
				/**
				 * Содержимое дня календаря — проброс слота `item` Calendar под тем
				 * же именем: заводить своё было бы вторым способом делать то же.
				 */
				item: {
					scope: { item: defineType<ICalendarItem>(Object) },
					description:
						'Содержимое дня календаря: цена, точка события. Без него — номер дня',
				},
			},
			props: {
				/** Строкой — дата `YYYY-MM-DD`, массивом — пара «начало, конец». */
				value: { type: [String, Array] },
				mode: { type: String, triggers: ['change:mode'] },
				open: { type: Boolean, triggers: ['change:open'] },
				closeOnSelect: { type: Boolean, triggers: ['change:closeOnSelect'] },
				min: { type: String, triggers: ['change:min'] },
				max: { type: String, triggers: ['change:max'] },
				unavailable: { type: Function, triggers: ['change:unavailable'] },
				weekStart: { type: Number, triggers: ['change:weekStart'] },
				locale: { type: String, triggers: ['change:locale'] },
				timeZone: { type: String, triggers: ['change:timeZone'] },
				triggerLabel: { type: String, triggers: ['change:triggerLabel'] },
				startLabel: { type: String, triggers: ['change:startLabel'] },
				endLabel: { type: String, triggers: ['change:endLabel'] },
				/**
				 * Имена концов диапазона в форме — у полей концов, как `name` у
				 * поля одной даты: значение в форму отдаёт поле.
				 */
				startName: { type: String, triggers: ['change:startName'] },
				endName: { type: String, triggers: ['change:endName'] },
				/**
				 * Сторона кнопки календаря в связке с панелью и её вид «нажат».
				 * Вычисляют ядро и `TDatePickerIdsPlugin` (`aria-controls`): своего
				 * экземпляра у кнопки нет, и формула в разметке повторилась бы в
				 * каждом из шести адаптеров.
				 */
				triggerAria: { type: Object, protected: true, triggers: ['change:triggerAria'] },
				triggerDataset: { type: Object, protected: true, triggers: ['change:open'] },
				/** Роль, модальность, имя и `id` панели: панель — Frame без экземпляра в ядре. */
				panelAria: { type: Object, protected: true, triggers: ['change:panelAria'] },
				/**
				 * Набор корня: у диапазона корень — группа полей концов со своим
				 * именем, у одной даты группа — само поле. Перечитывается на смену
				 * `aria` и режима.
				 */
				rootAria: {
					type: Object,
					protected: true,
					triggers: ['change:aria', 'change:mode'],
				},
				/** Можно ли открыть панель: запрещают `disabled` и `readonly`. */
				openable: {
					type: Boolean,
					protected: true,
					triggers: ['change:disabled', 'change:readonly'],
				},
			},
			events: ['open', 'close'],
		},

		plugins: [
			// Закрытие по нажатию мимо — без возврата фокуса и без подложки:
			// соседнее поле получает фокус с первого нажатия
			DismissPluginDescriptor,
			// Фон под открытой панелью спрятан от скринридера: панель модальна.
			// После dismiss: берёт у него панель
			HideOutsidePluginDescriptor,
			// Кнопка календаря и Alt+↓ на поле открывают панель
			DatePickerTriggerPluginDescriptor,
			// Первый фокус — день сетки, Tab замкнут, Escape закрывает. После
			// dismiss: берёт у него панель и `dismiss`
			DatePickerFocusPluginDescriptor,
			// `id` панели и `aria-controls` кнопки
			DatePickerIdsPluginDescriptor,
		],
	}),
)
