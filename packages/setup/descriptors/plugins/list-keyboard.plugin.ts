/**
 * Определение TListKeyboardPlugin (namespace `keyboard`) — клавиатурная навигация по списку.
 */

import { definePlugin } from '../../define'
import { TListKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ListKeyboardPluginDescriptor = () =>
	definePlugin({
		ctor: TListKeyboardPlugin,
		namespace: 'keyboard',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
