/**
 * Определение TSpinnerLayoutPlugin (namespace `layout`) — размер Spinner.
 *
 * Выход `layout_styles` — стили спиннера, их вешает шаблон.
 */

import { definePlugin } from '../../../protected/define'
import { TSpinnerLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const SpinnerLayoutPluginDescriptor = definePlugin({
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
