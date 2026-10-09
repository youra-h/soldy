/**
 * Определение TTableVirtualPlugin (namespace `virtual`) — окно таблицы в
 * документе: замер видимой полосы тела и шага строк и строка с DOM-фокусом.
 *
 * Что рисовать, решает расширение `virtual` коллекции строк; плагин отдаёт ему
 * то, что знает только живой документ. Своих пропсов и выходов у плагина нет:
 * режим окна — значение коллекции (`virtual`), а всё, что видно снаружи, —
 * тело (`bodyRows`) и наборы таблицы, шапки и строк. Движок плагин узнаёт от
 * реестра bundles, узлы строк — от реестра узлов, поэтому ставится после них.
 */

import { definePlugin } from '../../../protected/define'
import { TTableVirtualPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableVirtualPluginDescriptor = definePlugin({
	ctor: TTableVirtualPlugin,
	namespace: 'virtual',
	contribution: { events: [...PLUGIN_EVENTS] },
})
