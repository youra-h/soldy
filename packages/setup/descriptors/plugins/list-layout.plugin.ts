import { definePlugin } from '../base'
import { TListLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин управления высотой контейнера списка (maxRows).
 */
export const ListLayoutPluginDescriptor = () =>
	definePlugin({
		ctor: TListLayoutPlugin,
		namespace: 'layout',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
