/**
 * Определение TIconLayoutPlugin (namespace `layout`) — размер иконки.
 *
 * Выход `layout_styles` — стили из `size`, `width` и `height`, их вешает шаблон.
 */

import { definePlugin } from '../../define'
import { TIconLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TIconLayoutPluginEvents } from '@soldy/plugins'

export const IconLayoutPluginDescriptor = () =>
	definePlugin<'layout', TIconLayoutPluginEvents, object, Pick<TIconLayoutPlugin, 'styles'>>({
		ctor: TIconLayoutPlugin,
		namespace: 'layout',
		contribution: {
			events: [...PLUGIN_EVENTS],
			props: {
				styles: {
					type: Object,
					protected: true,
					triggers: ['change:styles'],
				},
			},
		},
	})
