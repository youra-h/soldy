import { definePlugin } from '../base'
import { TTabsViewPlugin } from '@soldy/plugins'

/**
 * Плагин отрисовки индикатора активного таба (line/outline).
 */
export const TabsViewPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsViewPlugin,
	})
