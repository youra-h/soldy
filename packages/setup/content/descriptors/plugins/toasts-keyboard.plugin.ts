/**
 * Определение TToastsKeyboardPlugin (namespace `keyboard`) — клавиатура тостов:
 * F8 ведёт фокус к новейшему тосту, Escape закрывает тост под фокусом, а фокус
 * закрытого тоста переходит соседу или туда, откуда пришёл.
 *
 * Подключается после плагинов коллекции — берёт у них движок и узлы тостов.
 */

import { definePlugin } from '../../../protected/define'
import { TToastsKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ToastsKeyboardPluginDescriptor = definePlugin({
	ctor: TToastsKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
