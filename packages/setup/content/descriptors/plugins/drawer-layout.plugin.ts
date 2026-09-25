/**
 * Определение TDrawerLayoutPlugin (namespace `layout`) — раскладка
 * выезжающей панели.
 *
 * Два выхода, как у раскладки окна: `layout_styles` — `z-index` слоя и
 * переменные размера панели (`--drawer-width`, `--drawer-height`),
 * `layout_backdropStyles` — тот же `z-index` подложки. Вешает их шаблон, край
 * и анимацию раскладывает тема.
 */

import { definePlugin } from '../../../protected/define'
import { TDrawerLayoutPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const DrawerLayoutPluginDescriptor = definePlugin({
	ctor: TDrawerLayoutPlugin,
	namespace: 'layout',
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			styles: {
				protected: true,
				triggers: ['change:styles'],
			},
			backdropStyles: {
				protected: true,
				triggers: ['change:backdropStyles'],
			},
		},
	},
})
