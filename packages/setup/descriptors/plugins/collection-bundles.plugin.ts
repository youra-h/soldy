import { definePlugin } from '../base'
import { TCollectionBundlesPlugin } from '@soldy/plugins'

/**
 * Плагин-реестр bundles элементов коллекции.
 * Устанавливается на owner-компоненте коллекции (например, Tabs).
 */
export const CollectionBundlesPluginDescriptor = definePlugin({
	ctor: TCollectionBundlesPlugin,
})
