/**
 * Определение TMenuGroupIdsPlugin (namespace `ids`) — имя группы меню от её
 * подписи: `id` подписи и `aria-labelledby` группы, пока подпись не пуста.
 *
 * Пропсов нет: плагин пишет в наборы группы (`aria`, `labelAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuGroupIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuGroupIdsPluginDescriptor = definePlugin({
	ctor: TMenuGroupIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
