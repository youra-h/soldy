import { definePlugin } from '../base'
import { TTabsLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин отслеживания изменения размеров табов (ResizeObserver).
 */
export const TabsLayoutPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsLayoutPlugin,
		namespace: 'layout',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
