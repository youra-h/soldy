/**
 * Определение TTabsLayoutPlugin (namespace `layout`) — размеры табов (ResizeObserver).
 */

import { definePlugin } from '../../../protected/define'
import { TTabsLayoutPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TabsLayoutPluginDescriptor = definePlugin({
	ctor: TTabsLayoutPlugin,
	namespace: 'layout',
	contribution: { events: [...PLUGIN_EVENTS] },
})
