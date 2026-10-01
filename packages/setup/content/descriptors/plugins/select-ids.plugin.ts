/**
 * Определение TSelectIdsPlugin (namespace `ids`) — связка «поле ↔ список»
 * Select в документе: `id` списка и `aria-controls` поля.
 *
 * Пропсов нет: плагин пишет в наборы Select (`listAria`, `field.aria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TSelectIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const SelectIdsPluginDescriptor = definePlugin({
	ctor: TSelectIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
