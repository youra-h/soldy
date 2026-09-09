import { definePlugin } from '../base'
import { TListWordWrapPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Применяет `wordWrap` из `ListLayoutPluginDescriptor` — `data-word-wrap` на
 * элементах, с разрешением «значение элемента поверх значения списка».
 */
export const ListWordWrapPluginDescriptor = () =>
	definePlugin({
		ctor: TListWordWrapPlugin,
		namespace: 'wordWrap',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
