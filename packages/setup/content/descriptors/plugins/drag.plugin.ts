/**
 * Определение TDragPlugin (namespace `drag`) — перетаскивание элементов коллекции.
 */

import { definePlugin } from '../../../protected/define'
import { TDragPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const DragPluginDescriptor = definePlugin({
	ctor: TDragPlugin,
	namespace: 'drag',
	contribution: { events: [...PLUGIN_EVENTS] },
})
