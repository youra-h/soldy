import { definePlugin } from '../base'
import { TListKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин клавиатурной навигации по списку.
 */
export const ListKeyboardPluginDescriptor = () =>
	definePlugin({
		ctor: TListKeyboardPlugin,
		namespace: 'keyboard',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
