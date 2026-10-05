/**
 * Определение TTableRowIdsPlugin (namespace `ids`) — имя строки таблицы в
 * документе: `id` её заголовка, на который ссылается чекбокс выбора строки.
 *
 * Пропсов нет: плагин пишет в набор строки `headerAria`, а его на ячейку
 * заголовка кладёт проекция ячеек.
 */

import { definePlugin } from '../../../protected/define'
import { TTableRowIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableRowIdsPluginDescriptor = definePlugin({
	ctor: TTableRowIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
