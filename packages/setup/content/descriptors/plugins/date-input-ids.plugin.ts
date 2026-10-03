/**
 * Определение TDateInputIdsPlugin (namespace `ids`) — `id` частей поля даты.
 *
 * Пропсов нет: плагин пишет `id` от монтирования в наборы частей, а ядро
 * раскладывает их в `segments`.
 */

import { definePlugin } from '../../../protected/define'
import { TDateInputIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DateInputIdsPluginDescriptor = definePlugin({
	ctor: TDateInputIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
