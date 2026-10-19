/**
 * Определение TItemGroupIdsPlugin (namespace `ids`) — имя группы элементов от
 * её подписи: `id` подписи и `aria-labelledby` группы, пока подпись не пуста.
 * Один на группы меню, ListBox и Select — его ставит `ItemGroupDescriptor`.
 *
 * Пропсов нет: плагин пишет в наборы группы (`aria`, `labelAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TItemGroupIdsPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ItemGroupIdsPluginDescriptor = definePlugin({
	ctor: TItemGroupIdsPlugin,
	namespace: 'ids',
	contribution: { events: [...PLUGIN_EVENTS] },
})
