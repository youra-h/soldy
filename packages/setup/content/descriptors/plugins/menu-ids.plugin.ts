/**
 * Определение TMenuIdsPlugin (namespace `ids`) — связка «кнопка ↔ меню» в
 * документе: `id` и `aria-controls` триггера, `id` и `aria-labelledby` панели.
 *
 * Пропсов нет: плагин пишет в наборы меню (`aria`, `triggerAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuIdsPluginDescriptor = definePlugin({
	ctor: TMenuIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
