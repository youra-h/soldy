import { definePlugin } from '../base'
import { TTabsLayoutPlugin } from '@soldy/plugins'

/**
 * Плагин отслеживания изменения размеров табов (ResizeObserver).
 */
export const TabsLayoutPluginDescriptor = definePlugin({
	ctor: TTabsLayoutPlugin,
})
