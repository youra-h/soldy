/**
 * Определение TDatePickerNamesPlugin (namespace `names`) — имена DatePicker
 * от локали.
 *
 * Имена кнопок плагин пишет сам — в наборы: кнопки очистки (`clearAria`, как
 * у любого поля — с именем DatePicker), кнопки календаря и панели
 * (`triggerAria`, `panelAria`). Выходы `names_start` и `names_end` — имена
 * полей концов диапазона: шаблон отдаёт их полям пропом `aria_label`. Выходы
 * `names_confirm` и `names_cancel` — текст кнопок «OK» и «Отмена» подвала
 * панели при `confirmable`: шаблон отдаёт его кнопкам пропом `text`.
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
			confirm: { protected: true, triggers: ['change:confirm'] },
			cancel: { protected: true, triggers: ['change:cancel'] },
		},
	},
})
