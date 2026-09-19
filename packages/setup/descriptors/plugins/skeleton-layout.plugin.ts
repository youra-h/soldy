/**
 * Определение TSkeletonLayoutPlugin (namespace `layout`) — размер заглушки Skeleton.
 *
 * Выход `layout_styles` — ширина и высота заглушки, их вешает шаблон.
 */

import { definePlugin } from '../../define'
import { TSkeletonLayoutPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const SkeletonLayoutPluginDescriptor = definePlugin({
	ctor: TSkeletonLayoutPlugin,
	namespace: 'layout',
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			styles: {
				protected: true,
				triggers: ['change:styles'],
			},
		},
	},
})
