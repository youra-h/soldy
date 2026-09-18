import { definePlugin } from '../../define'
import { TSpinnerLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TSpinnerLayoutPluginEvents } from '@soldy/plugins'

export const SpinnerLayoutPluginDescriptor = () =>
	definePlugin<
		'layout',
		TSpinnerLayoutPluginEvents,
		object,
		Pick<TSpinnerLayoutPlugin, 'styles'>
	>({
		ctor: TSpinnerLayoutPlugin,
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
