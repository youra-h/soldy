import { definePlugin } from '../base'
import { TReadyPlugin } from '@soldy/plugins'

export const ReadyPluginDescriptor = () =>
	definePlugin({
		ctor: TReadyPlugin,
		namespace: 'ready',
	})
