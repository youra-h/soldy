/**
 * Определение TCollectionElements (namespace `elements`) — DOM-узлы элементов коллекции.
 *
 * Зависит от CollectionBundlesPlugin (регистрируется в том же bundle).
 */

import { definePlugin } from '../../define'
import { TCollectionElements, PLUGIN_EVENTS } from '@soldy/plugins'

export const CollectionElementsPluginDescriptor = () =>
	definePlugin({
		ctor: TCollectionElements,
		namespace: 'elements',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
