import { definePlugin } from '../base'
import { TDragPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Плагин drag-and-drop для перетаскивания элементов коллекции.
 */
export const DragPluginDescriptor = () =>
	definePlugin({
		ctor: TDragPlugin,
		namespace: 'drag',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
