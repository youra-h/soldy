import { definePlugin } from '../base'
import { TListScrollPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин автоматической прокрутки списка к выделенному элементу.
 */
export const ListScrollPluginDescriptor = () =>
	definePlugin({
		ctor: TListScrollPlugin,
		namespace: 'scroll',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
