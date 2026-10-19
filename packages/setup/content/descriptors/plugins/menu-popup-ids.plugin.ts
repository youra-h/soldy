/**
 * Определение TMenuPopupIdsPlugin (namespace `ids`) — связка «пункт ↔ его
 * панель» в документе у пункта с подменю и у пункта с панелью: `id` и
 * `aria-controls` строки пункта, `id` и `aria-labelledby` панели.
 *
 * Пропсов нет: плагин пишет в наборы пункта (`aria`, `panelAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuPopupIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuPopupIdsPluginDescriptor = definePlugin({
	ctor: TMenuPopupIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
