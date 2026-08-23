import { definePlugin } from '../base'
import { TElementPlugin } from '@soldy/plugins'
import { ElementContribution } from '../../contributions'

export const ElementPluginDescriptor = definePlugin({
	ctor: TElementPlugin,
	namespace: 'element',
	contribution: ElementContribution,
})
