import { definePlugin } from '../../define'
import { TSkeletonLayoutPlugin } from '@soldy/plugins'
import type { TSkeletonLayoutPluginEvents } from '@soldy/plugins'
import { SkeletonLayoutContribution } from '../../contributions'

export const SkeletonLayoutPluginDescriptor = () =>
	definePlugin<'layout', TSkeletonLayoutPluginEvents>({
		ctor: TSkeletonLayoutPlugin,
		namespace: 'layout',
		contribution: SkeletonLayoutContribution(),
	})
