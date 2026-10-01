/**
 * Определение TTabsItemIdsPlugin (namespace `ids`) — связка «таб ↔ панель»
 * в документе со стороны таба: его `id` и `aria-controls`.
 *
 * Пропсов нет: плагин пишет в `aria` таба, а его разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TTabsItemIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TabsItemIdsPluginDescriptor = definePlugin({
	ctor: TTabsItemIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
