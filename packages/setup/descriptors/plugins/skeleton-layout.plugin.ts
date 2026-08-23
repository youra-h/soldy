import { definePlugin } from '../base'
import { TSkeletonLayoutPlugin } from '@soldy/plugins'
import { SkeletonLayoutContribution } from '../../contributions'

export const SkeletonLayoutPluginDescriptor = definePlugin({
	ctor: TSkeletonLayoutPlugin,
	namespace: 'layout',
	contribution: SkeletonLayoutContribution,
})
