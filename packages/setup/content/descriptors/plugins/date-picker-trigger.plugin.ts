/**
 * Определение TDatePickerTriggerPlugin (namespace `trigger`) — что открывает
 * панель DatePicker: клик по кнопке календаря — тумблер, Alt+↓ на поле —
 * открыть, см. `TDatePickerTriggerPlugin`.
 */

import { definePlugin } from '../../../protected/define'
import { TDatePickerTriggerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DatePickerTriggerPluginDescriptor = definePlugin({
	ctor: TDatePickerTriggerPlugin,
	namespace: 'trigger',
	/**
	 * Ничего не отдаёт наружу: открытость (`open`) уже читается как проп
	 * владельца. Контрибуция нужна лишь для того, чтобы `create` попал в
	 * события, как и у любого плагина.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
	},
})
