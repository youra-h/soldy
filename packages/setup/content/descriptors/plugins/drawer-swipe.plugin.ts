/**
 * Определение TDrawerSwipePlugin (namespace `swipe`) — жест выезжающей
 * панели: смахнуть её к её краю, чтобы закрыть.
 *
 * Своих пропсов и выходов у плагина нет: за что тянуть, выбирает проп
 * компонента `swipe`, признак «тянут» и закрытие видны через владельца, а
 * сдвиг во время жеста — операция над узлом, и через обмен он не ходит.
 */

import { definePlugin } from '../../../protected/define'
import { TDrawerSwipePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DrawerSwipePluginDescriptor = definePlugin({
	ctor: TDrawerSwipePlugin,
	namespace: 'swipe',
	contribution: { events: [...PLUGIN_EVENTS] },
})
