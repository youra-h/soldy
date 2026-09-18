import { definePlugin } from '../../define'
import { TFrameLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TFrameLayoutPluginEvents } from '@soldy/plugins'

export const FrameLayoutPluginDescriptor = () =>
	definePlugin<'layout', TFrameLayoutPluginEvents, object, Pick<TFrameLayoutPlugin, 'styles'>>({
		ctor: TFrameLayoutPlugin,
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
