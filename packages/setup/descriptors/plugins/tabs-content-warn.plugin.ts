import { definePlugin } from '../base'
import { TTabsContentWarnPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Диагностика неверного слота: предупреждает, если панель Tabs.Content
 * оказалась внутри [role="tablist"] (положена в default вместо content).
 */
export const TabsContentWarnPluginDescriptor = () =>
	definePlugin({
		ctor: TTabsContentWarnPlugin,
		namespace: 'contentWarn',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
