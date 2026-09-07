import { definePlugin } from '../base'
import { TInputControlPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const InputControlPluginDescriptor = () =>
	definePlugin({
		ctor: TInputControlPlugin,
		namespace: 'input-control',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
