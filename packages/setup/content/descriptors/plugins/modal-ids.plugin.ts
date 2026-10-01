/**
 * Определение TModalIdsPlugin (namespace `ids`) — имя модального слоя в
 * документе: `id` заголовка и `aria-labelledby` панели.
 *
 * Пропсов нет: плагин пишет в наборы слоя (`aria`, `titleAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TModalIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ModalIdsPluginDescriptor = definePlugin({
	ctor: TModalIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
