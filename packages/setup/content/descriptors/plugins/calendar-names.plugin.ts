/**
 * Определение TCalendarNamesPlugin (namespace `names`) — имена кнопок
 * календаря от локали: листания месяцев и стрелок панели выбора месяца и
 * года.
 *
 * Пропсов нет: плагин пишет в наборы календаря (`prevAria`, `nextAria`) и
 * мест панели, которые разметка получает выходом `pickers`.
 */

import { definePlugin } from '../../../protected/define'
import { TCalendarNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const CalendarNamesPluginDescriptor = definePlugin({
	ctor: TCalendarNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
