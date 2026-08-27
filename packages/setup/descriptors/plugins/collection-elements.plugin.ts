import { definePlugin } from '../base'
import { TCollectionElements } from '@soldy/plugins'

/**
 * Плагин доступа к DOM-элементам элементов коллекции.
 * Зависит от CollectionBundlesPlugin (регистрируется в том же bundle).
 */
export const CollectionElementsPluginDescriptor = definePlugin({
	ctor: TCollectionElements,
})
