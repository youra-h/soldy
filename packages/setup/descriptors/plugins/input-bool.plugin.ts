import { definePlugin } from '../base'
import { TInputBoolPlugin } from '@soldy/plugins'

export const InputBoolPluginDescriptor = definePlugin({
	ctor: TInputBoolPlugin,
	namespace: 'input-bool',
})
