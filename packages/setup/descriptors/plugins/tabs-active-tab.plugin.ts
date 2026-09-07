import { definePlugin } from '../base'
import { TTabsActiveTabPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин вычисления позиции/размера активного таба.
 */
export const TabsActiveTabPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsActiveTabPlugin,
		namespace: 'activeTab',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
