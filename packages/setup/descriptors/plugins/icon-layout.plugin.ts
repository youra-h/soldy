import { definePlugin } from '../base'
import { TIconLayoutPlugin } from '@soldy/plugins'
import { IconLayoutContribution } from '../../contributions'

export const IconLayoutPluginDescriptor = definePlugin({
	ctor: TIconLayoutPlugin,
	namespace: 'layout',
	contribution: IconLayoutContribution,
})
