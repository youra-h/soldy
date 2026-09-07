import { definePlugin } from '../base'
import { TCollectionElements, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин доступа к DOM-элементам элементов коллекции.
 * Зависит от CollectionBundlesPlugin (регистрируется в том же bundle).
 */
export const CollectionElementsPluginDescriptor = () =>
	definePlugin({
		ctor: TCollectionElements,
		namespace: 'elements',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
