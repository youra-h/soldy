/**
 * Определение TTagsKeyboardPlugin (namespace `keyboard`) — клавиатура Tags с выбором по APG Listbox.
 *
 * Стрелки и `Home`/`End` переносят фокус по тегам, `Delete` и `Backspace`
 * закрывают тег. Подключается после плагинов коллекции — берёт у них движок и
 * узлы тегов.
 */

import { definePlugin } from '../../../protected/define'
import { TTagsKeyboardPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TagsKeyboardPluginDescriptor = definePlugin({
	ctor: TTagsKeyboardPlugin,
	namespace: 'keyboard',
	contribution: { events: [...PLUGIN_EVENTS] },
})
