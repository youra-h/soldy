/**
 * Определение TTableGridPlugin (namespace `grid`) — сетка таблицы в
 * документе: клавиши APG Data Grid, выбор строки нажатием и DOM-фокус за
 * фокусом сетки.
 *
 * Переводит клавиши и нажатия в команды расширения `grid` коллекции строк;
 * какая ячейка под фокусом и что выбрано, решает оно. Своих пропсов и выходов
 * у плагина нет: режим сетки — значение коллекции (`grid`), а всё, что видно
 * снаружи, — наборы таблицы, строк и ячеек. Движок плагин узнаёт от реестра
 * bundles, узлы строк — от реестра узлов, поэтому ставится после них. Шаг
 * PageUp и PageDown — опция установки:
 * `TableGridPluginDescriptor.with({ pageStep: 20 })`.
 */

import { definePlugin } from '../../../protected/define'
import { TTableGridPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableGridPluginDescriptor = definePlugin({
	ctor: TTableGridPlugin,
	namespace: 'grid',
	contribution: { events: [...PLUGIN_EVENTS] },
})
