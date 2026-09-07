import { definePlugin } from '../base'
import { TTabsViewPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин отрисовки индикатора активного таба (line/outline).
 */
export const TabsViewPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsViewPlugin,
		namespace: 'view',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
