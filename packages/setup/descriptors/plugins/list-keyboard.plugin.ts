import { definePlugin } from '../base'
import { TListKeyboardPlugin } from '@soldy/plugins'

/**
 * Плагин клавиатурной навигации по списку.
 */
export const ListKeyboardPluginDescriptor = () =>
	definePlugin({
		ctor: TListKeyboardPlugin,
	})
