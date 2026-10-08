/**
 * Определение TDatePickerNamesPlugin (namespace `names`) — имена DatePicker
 * от локали.
 *
 * Имя кнопки календаря плагин пишет сам — в наборы кнопки и панели
 * (`triggerAria`, `panelAria`). Выходы `names_start` и `names_end` — имена
 * полей концов диапазона: шаблон отдаёт их полям пропом `aria_label`.
 */

import { definePlugin } from '../../../protected/define'
import { TDatePickerNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DatePickerNamesPluginDescriptor = definePlugin({
	ctor: TDatePickerNamesPlugin,
	namespace: 'names',
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			start: { protected: true, triggers: ['change:start'] },
			end: { protected: true, triggers: ['change:end'] },
		},
	},
})
