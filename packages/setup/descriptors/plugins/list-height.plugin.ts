import { definePlugin } from '../base'
import { TListHeightPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Применяет `maxRows` из `ListLayoutPluginDescriptor` — предел высоты
 * контейнера элементов и прокрутка сверх него.
 */
export const ListHeightPluginDescriptor = () =>
	definePlugin({
		ctor: TListHeightPlugin,
		namespace: 'height',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
