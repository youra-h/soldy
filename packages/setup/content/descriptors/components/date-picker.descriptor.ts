/**
 * Дескриптор DatePicker (TDatePicker).
 *
 * Наследует `InputControlDescriptor` (value, name, readonly, required, id,
 * disabled, size, variant, ...) и добавляет режим, открытость панели и то, что
 * DatePicker отдаёт полям и календарю: границы, недоступные дни, первый день
 * недели, пояс «сегодня» — и имена концов в форме. Язык и имена кнопки и
 * концов диапазона задаёт приложение на всю библиотеку: их пишут плагины
 * языка и словаря, а разметка получает готовые выходы.
 *
 * Поля (`field`, `start`, `end`), календарь и его движок — экземпляры ядра
 * DatePicker: разметка отдаёт их компонентам целиком (`:ctrl`, `:engine`), как
 * Select — поле. Пропсов календаря сверх перечисленных (месяцы сеток) здесь
 * нет: они у `ctrl.calendar`.
 *
 * Паттерн — APG Date Picker Dialog: поле и отдельная кнопка календаря, панель —
 * диалог, модальный для клавиатуры и скринридера, а нажатие мимо просто её
 * закрывает. Жест (`swipe`) смахивает панель от поля, как у Select. См.
 * AGENTS.md, «Даты» и «Готовые паттерны».
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
	LocalePluginDescriptor,
	SwipePluginDescriptor,
	TranslationsPluginDescriptor,
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
				/**
				 * Язык поля и календаря — не вход: его задаёт приложение на всю
				 * библиотеку, и пишет плагин языка. Полям и календарю DatePicker
				 * отдаёт его сам.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				timeZone: { type: String, triggers: ['change:timeZone'] },
				/**
				 * Имена полей концов диапазона — из словаря. Выходы: разметка
				 * отдаёт их полям как `aria_label`.
				 */
				startLabel: { type: String, protected: true, triggers: ['change:translations'] },
				endLabel: { type: String, protected: true, triggers: ['change:translations'] },
				/**
				 * Имена концов диапазона в форме — у полей концов, как `name` у
				 * поля одной даты: значение в форму отдаёт поле.
				 */
				startName: { type: String, triggers: ['change:startName'] },
				endName: { type: String, triggers: ['change:endName'] },
				/** За что панель смахивают, чтобы закрыть. По умолчанию — ни за что. */
				swipe: { type: String, triggers: ['change:swipe'] },
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
				 * `data-*` панели: тянут ли её. Набор отдельный от `panelAria`: ARIA
				 * и `data-*` не смешиваются. Открытость панели (`data-open`) пишет её
				 * слой, сторону (`data-placement`) — плагин якоря.
				 */
				panelDataset: { type: Object, protected: true, triggers: ['change:swiping'] },
				/**
				 * Рисовать ли полосу, за которую тянут. Вычисляет ядро: разметка
				 * без экземпляра формулу не повторяет.
				 */
				handleRendered: { type: Boolean, protected: true, triggers: ['change:swipe'] },
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
			// Язык и словарь приложения — до поведения: формат полей и имена
			// кнопки и концов с первой отрисовки
			LocalePluginDescriptor,
			TranslationsPluginDescriptor,
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
			// Смахнуть панель, чтобы закрыть. После dismiss: берёт у него панель
			SwipePluginDescriptor,
		],
	}),
)
