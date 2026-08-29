import { definePlugin } from '../base'
import { TDragPlugin } from '@soldy/plugins'

/**
 * Плагин drag-and-drop для перетаскивания элементов коллекции.
 */
export const DragPluginDescriptor = () =>
	definePlugin({
		ctor: TDragPlugin,
	})
