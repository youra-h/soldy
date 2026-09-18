import { definePlugin } from '../../define'
import { TSkeletonLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TSkeletonLayoutPluginEvents } from '@soldy/plugins'

export const SkeletonLayoutPluginDescriptor = () =>
	definePlugin<'layout', TSkeletonLayoutPluginEvents>({
		ctor: TSkeletonLayoutPlugin,
		namespace: 'layout',
		contribution: {
			events: [...PLUGIN_EVENTS],
			props: {
				styles: {
					protected: true,
					triggers: ['change:styles'],
				},
			},
		},
	})
