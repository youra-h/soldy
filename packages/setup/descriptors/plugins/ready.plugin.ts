import { definePlugin } from '../base'
import { TReadyPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ReadyPluginDescriptor = () =>
	definePlugin({
		ctor: TReadyPlugin,
		namespace: 'ready',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
