/**
 * Определение TTabsContentWarnPlugin (namespace `contentWarn`) — диагностика слота панели.
 *
 * Предупреждает, если панель Tabs.Content оказалась внутри [role="tablist"]
 * (положена в default вместо content).
 */

import { definePlugin } from '../../../protected/define'
import { TTabsContentWarnPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TabsContentWarnPluginDescriptor = definePlugin({
	ctor: TTabsContentWarnPlugin,
	namespace: 'contentWarn',
	contribution: { events: [...PLUGIN_EVENTS] },
})
