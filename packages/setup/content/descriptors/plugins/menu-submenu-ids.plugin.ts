/**
 * Определение TMenuSubmenuIdsPlugin (namespace `ids`) — связка «пункт ↔
 * подменю» в документе: `id` и `aria-controls` строки пункта, `id` и
 * `aria-labelledby` панели подменю.
 *
 * Пропсов нет: плагин пишет в наборы пункта (`aria`, `panelAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuSubmenuIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuSubmenuIdsPluginDescriptor = definePlugin({
	ctor: TMenuSubmenuIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
