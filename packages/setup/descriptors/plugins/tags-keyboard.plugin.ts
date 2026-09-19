import { definePlugin } from '../../define'
import { TTagsKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Клавиатура Tags с выбором по паттерну APG Listbox: стрелки и `Home`/`End`
 * переносят фокус по тегам, `Delete` и `Backspace` закрывают тег. Подключается
 * после плагинов коллекции — берёт у них движок и узлы тегов.
 */
export const TagsKeyboardPluginDescriptor = () =>
	definePlugin({
		ctor: TTagsKeyboardPlugin,
		namespace: 'keyboard',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
