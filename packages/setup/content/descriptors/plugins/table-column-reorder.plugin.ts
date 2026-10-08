/**
 * Определение TTableColumnReorderPlugin (namespace `reorder`) — перестановка
 * колонок пользователем: заголовок тащат указателем или сдвигают
 * Ctrl+Shift+←/→.
 *
 * Переводит указатель и клавиши в команды расширения `columns` коллекции
 * строк; что можно взять, куда колонка встанет и `column:move` решает оно.
 * Своих пропсов и выходов у плагина нет: `reorderable` — свойство колонки, а
 * всё, что видно снаружи, — её наборы и событие таблицы. Движок плагин узнаёт
 * от реестра bundles, поэтому ставится после него.
 */

import { definePlugin } from '../../../protected/define'
import { TTableColumnReorderPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableColumnReorderPluginDescriptor = definePlugin({
	ctor: TTableColumnReorderPlugin,
	namespace: 'reorder',
	contribution: { events: [...PLUGIN_EVENTS] },
})
