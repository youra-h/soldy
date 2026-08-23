import { definePlugin } from '../base'
import { TInputPlugin } from '@soldy/plugins'

export const InputPluginDescriptor = definePlugin({
	ctor: TInputPlugin,
	namespace: 'input',
})
