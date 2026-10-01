/**
 * Определение TTooltipIdsPlugin (namespace `ids`) — связка «триггер ↔ панель»
 * подсказки в документе: `id` панели и ссылка триггера на него по режиму.
 *
 * Пропсов нет: плагин пишет в наборы подсказки (`aria`, `triggerAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TTooltipIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TooltipIdsPluginDescriptor = definePlugin({
	ctor: TTooltipIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
