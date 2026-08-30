import { definePlugin } from '../base'
import { TListLayoutPlugin } from '@soldy/plugins'

/**
 * Плагин управления высотой контейнера списка (maxRows).
 */
export const ListLayoutPluginDescriptor = () =>
	definePlugin({
		ctor: TListLayoutPlugin,
	})
