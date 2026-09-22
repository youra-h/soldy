/**
 * Определение TCollectionBundlesPlugin (namespace `bundles`) — реестр bundles элементов.
 *
 * Устанавливается на owner-компоненте коллекции (например, Tabs).
 */

import { definePlugin } from '../../../protected/define'
import { TCollectionBundlesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const CollectionBundlesPluginDescriptor = definePlugin({
	ctor: TCollectionBundlesPlugin,
	namespace: 'bundles',
	contribution: { events: [...PLUGIN_EVENTS] },
})
