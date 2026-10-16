/**
 * Определение TToastsLayoutPlugin (namespace `layout`) — раскладка региона
 * тостов.
 *
 * Выход один — `layout_styles`: `z-index` слоя. Вешает его разметка на
 * регион, место у края окна раскладывает тема.
 */

import { definePlugin } from '../../../protected/define'
import { TToastsLayoutPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ToastsLayoutPluginDescriptor = definePlugin({
	ctor: TToastsLayoutPlugin,
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
