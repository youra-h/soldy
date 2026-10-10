/**
 * Дескриптор DatePicker (TDatePicker).
 *
 * Наследует `FieldDescriptor` — DatePicker сам поле: кнопка очистки
 * (`clearable`, набор `clearAria`) поверх value, name, readonly, required, id,
 * disabled, size, variant, ... Добавляет слоты, режим, открытость
 * панели, выбор с подтверждением и то, что DatePicker отдаёт полям и
 * календарю: границы, недоступные дни, первый день недели, пояс «сегодня» — и
 * имена концов в форме. Язык, имена кнопок и концов диапазона и текст кнопок
 * подвала — от локали поддерева: их пишут плагины языка и имён, а разметка
 * получает готовые выходы.
 *
 * Кнопка очистки одна на значение: у одной даты — в слоте `clear` поля, перед
 * кнопкой календаря, у диапазона — одна на период, после поля конца. Полям
 * `clearable` не уходит: очищает DatePicker свой режим целиком.
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
	DatePickerNamesPluginDescriptor,
	LocalePluginDescriptor,
	SwipePluginDescriptor,
} from '../plugins'
import { FieldDescriptor } from './field.descriptor'

export const DatePickerDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TDatePicker,

		extends: FieldDescriptor(),

		contribution: {
			slots: {
				/**
				 * Своя кнопка очистки вместо встроенной — целиком, и рисуется, когда
				 * задана, без `clearable`. Scope — команда DatePicker `clear`,
				 * привязанная к инстансу: кнопка зовёт её голой функцией.
				 */
				clear: {
					scope: { clear: defineType<() => void>(Function) },
					description: 'Кнопка очистки значения',
				},
				'trigger-icon': { description: 'Значок кнопки календаря' },
				/**
				 * Содержимое дня календаря — проброс слота `item` Calendar под тем
				 * же именем и с тем же scope: заводить своё было бы вторым способом
				 * делать то же.
				 */
				item: {
					scope: {
						item: defineType<ICalendarItem>(Object),
						text: defineType<string>(String),
					},
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
				/**
				 * Выбор подтверждают кнопкой: в подвале панели — «Отмена» и «OK»,
				 * их текст — строки локали, выходы плагина имён.
				 */
				confirmable: { type: Boolean, triggers: ['change:confirmable'] },
				min: { type: String, triggers: ['change:min'] },
				max: { type: String, triggers: ['change:max'] },
				unavailable: { type: Function, triggers: ['change:unavailable'] },
				weekStart: { type: Number, triggers: ['change:weekStart'] },
				/**
				 * Язык поля и календаря — не вход: это тег локали поддерева, и
				 * пишет его плагин языка. Полям и календарю DatePicker отдаёт его
				 * сам.
				 */
				locale: { type: String, protected: true, triggers: ['change:locale'] },
				timeZone: { type: String, triggers: ['change:timeZone'] },
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
				/**
				 * Выключена ли «OK»: пока диапазон выбран наполовину. Вычисляет
				 * ядро по якорю выбора календаря — разметка формулу не повторяет.
				 */
				confirmDisabled: {
					type: Boolean,
					protected: true,
					triggers: ['change:confirmDisabled'],
				},
			},
			events: ['open', 'close'],
		},

		plugins: [
			// Язык — до поведения: формат полей с первой отрисовки
			LocalePluginDescriptor,
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
			// Имена кнопок очистки и календаря, панели и полей концов и текст
			// кнопок подвала от локали
			DatePickerNamesPluginDescriptor,
			// Смахнуть панель, чтобы закрыть. После dismiss: берёт у него панель
			SwipePluginDescriptor,
		],
	}),
)
