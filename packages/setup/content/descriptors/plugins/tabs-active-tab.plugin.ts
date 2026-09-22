/**
 * Определение TTabsActiveTabPlugin (namespace `activeTab`) — геометрия активного таба.
 */

import { definePlugin } from '../../../protected/define'
import { TTabsActiveTabPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TabsActiveTabPluginDescriptor = definePlugin({
	ctor: TTabsActiveTabPlugin,
	namespace: 'activeTab',
	contribution: { events: [...PLUGIN_EVENTS] },
})
