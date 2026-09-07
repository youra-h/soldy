import { definePlugin } from '../base'
import { TCollectionBundlesPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин-реестр bundles элементов коллекции.
 * Устанавливается на owner-компоненте коллекции (например, Tabs).
 */
export const CollectionBundlesPluginDescriptor = () =>
	definePlugin({
		ctor: TCollectionBundlesPlugin,
		namespace: 'bundles',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
