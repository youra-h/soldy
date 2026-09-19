/**
 * Определение TFrameLayoutPlugin (namespace `layout`) — раскладка Frame.
 *
 * Выход `layout_styles` — стили из собственных пропсов Frame, их вешает шаблон.
 */

import { definePlugin } from '../../define'
import { TFrameLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const FrameLayoutPluginDescriptor = definePlugin({
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
