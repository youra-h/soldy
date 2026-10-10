/**
 * Определение TTableLayoutPlugin (namespace `layout`) — место под колонки
 * таблицы: ширина её окна без колонки выбора.
 *
 * Отдаёт место расширению колонок коллекции строк, а ширины колонок и
 * признак «колонки шире места» раскладывает оно — по месту и `columnFit`
 * таблицы. Своих пропсов и выходов у плагина нет: всё, что видно снаружи, —
 * ширины колонок и наборы таблицы. Движок плагин узнаёт от реестра bundles,
 * поэтому ставится после него.
 */

import { definePlugin } from '../../../protected/define'
import { TTableLayoutPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableLayoutPluginDescriptor = definePlugin({
	ctor: TTableLayoutPlugin,
	namespace: 'layout',
	contribution: { events: [...PLUGIN_EVENTS] },
})
