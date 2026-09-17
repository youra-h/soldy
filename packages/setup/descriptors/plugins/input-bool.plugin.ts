import { definePlugin } from '../../define'
import { TInputBoolPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const InputBoolPluginDescriptor = () =>
	definePlugin({
		ctor: TInputBoolPlugin,
		namespace: 'input-bool',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
