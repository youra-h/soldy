import { definePlugin } from '../base'
import { TInputControlPlugin } from '@soldy/plugins'

export const InputControlPluginDescriptor = () =>
	definePlugin({
		ctor: TInputControlPlugin,
		namespace: 'input-control',
	})
