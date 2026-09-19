/**
 * Определение TTabsActiveTabPlugin (namespace `activeTab`) — геометрия активного таба.
 */

import { definePlugin } from '../../define'
import { TTabsActiveTabPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const TabsActiveTabPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsActiveTabPlugin,
		namespace: 'activeTab',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
