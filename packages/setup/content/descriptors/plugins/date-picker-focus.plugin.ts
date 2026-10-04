/**
 * Определение TDatePickerFocusPlugin (namespace `focus`) — модель фокуса
 * панели DatePicker.
 *
 * Первый фокус — день сетки календаря, Tab замкнут в панели, как у модального
 * окна, а нажатие мимо фокус отпускает, как у немодального поповера, см.
 * `TDatePickerFocusPlugin`. Неймспейс тот же, что у остальных моделей фокуса:
 * у компонента она одна, а какая именно — решает его дескриптор. Ставится
 * после `TDismissPlugin`: берёт у него панель и событие `dismiss`.
 */

import { definePlugin } from '../../../protected/define'
import { TDatePickerFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DatePickerFocusPluginDescriptor = definePlugin({
	ctor: TDatePickerFocusPlugin,
	namespace: 'focus',
	/**
	 * Ничего не отдаёт наружу: фокус — операция над DOM, а не значение.
	 * Контрибуция нужна лишь для того, чтобы `create` попал в события, как у
	 * любого плагина.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
	},
})
