/**
 * Определение TTableColumnIdsPlugin (namespace `ids`) — имя заголовка колонки
 * и её ручки ширины в документе: `id` обёртки содержимого заголовка и ссылки
 * на неё у заголовка и у поля ручки.
 *
 * Пропсов нет: плагин пишет в наборы колонки — `contentAria`, `aria` и
 * `resizerAria`.
 */

import { definePlugin } from '../../../protected/define'
import { TTableColumnIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableColumnIdsPluginDescriptor = definePlugin({
	ctor: TTableColumnIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
