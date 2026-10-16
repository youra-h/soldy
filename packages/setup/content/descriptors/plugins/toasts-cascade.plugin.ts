/**
 * Определение TToastsCascadePlugin (namespace `cascade`) — листание стопки
 * тостов: колесо над регионом и стрелки при фокусе на тосте выводят задний
 * тост вперёд перестановкой в коллекции. Без стопки (`layout: 'list'`) плагин
 * ничего не делает.
 *
 * Подключается после плагинов коллекции — берёт у них движок и узлы тостов.
 */

import { definePlugin } from '../../../protected/define'
import { TToastsCascadePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ToastsCascadePluginDescriptor = definePlugin({
	ctor: TToastsCascadePlugin,
	namespace: 'cascade',
	contribution: { events: [...PLUGIN_EVENTS] },
})
