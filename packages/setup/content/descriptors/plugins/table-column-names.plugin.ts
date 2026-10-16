/**
 * Определение TTableColumnNamesPlugin (namespace `names`) — имя кнопки
 * сортировки в заголовке колонки от локали, вместе с подписью колонки.
 *
 * Пропсов нет: плагин пишет в набор колонки (`sortAria`), а разметка
 * заголовка его уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TTableColumnNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableColumnNamesPluginDescriptor = definePlugin({
	ctor: TTableColumnNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
