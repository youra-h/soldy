import { definePlugin } from '../base'
import { TInputPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const InputPluginDescriptor = () =>
	definePlugin({
		ctor: TInputPlugin,
		namespace: 'input',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
