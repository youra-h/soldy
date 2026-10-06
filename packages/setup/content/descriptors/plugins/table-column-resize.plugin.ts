/**
 * Определение TTableColumnResizePlugin (namespace `resize`) — ручка ширины
 * колонки: указатель, клавиши, жест скринридера и замер заголовка.
 *
 * Переводит протяжку и клавиши в px и зовёт команды колонки; ширину, её
 * пределы и `commit` решает колонка. Своих пропсов и выходов у плагина нет:
 * `resizable` и границы ширины — свойства колонки, а всё, что видно снаружи, —
 * её ширина и состояние. Шаги клавиш задают опции установки:
 * `TableColumnResizePluginDescriptor.with({ step: 20, largeStep: 200 })`.
 */

import { definePlugin } from '../../../protected/define'
import { TTableColumnResizePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableColumnResizePluginDescriptor = definePlugin({
	ctor: TTableColumnResizePlugin,
	namespace: 'resize',
	contribution: { events: [...PLUGIN_EVENTS] },
})
