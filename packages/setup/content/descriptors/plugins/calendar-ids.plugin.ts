/**
 * Определение TCalendarIdsPlugin (namespace `ids`) — имена сеток календаря в
 * документе: `id` заголовка месяца и `aria-labelledby` его сетки.
 *
 * Пропсов нет: плагин пишет в наборы мест сеток, а их вид раскладывает в
 * `grids`.
 */

import { definePlugin } from '../../../protected/define'
import { TCalendarIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const CalendarIdsPluginDescriptor = definePlugin({
	ctor: TCalendarIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
