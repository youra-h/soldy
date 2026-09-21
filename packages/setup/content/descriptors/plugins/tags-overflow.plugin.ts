/**
 * Определение TTagsOverflowPlugin (namespace `overflow`) — замер ряда тегов.
 *
 * Считает, сколько тегов помещается в строку, и отдаёт число коллекции; делит
 * состав уже расширение `overflow`. Подключается после плагинов коллекции —
 * берёт у них движок и узлы тегов.
 */

import { definePlugin } from '../../../protected/define'
import { TTagsOverflowPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const TagsOverflowPluginDescriptor = definePlugin({
	ctor: TTagsOverflowPlugin,
	namespace: 'overflow',
	contribution: { events: [...PLUGIN_EVENTS] },
})
