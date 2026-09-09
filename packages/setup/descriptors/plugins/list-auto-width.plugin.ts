import { definePlugin } from '../base'
import { TListAutoWidthPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Применяет `autoWidth` из `ListLayoutPluginDescriptor` — класс `--auto-width`.
 * Своих пропов не объявляет: свойство одно, и владеет им плагин раскладки.
 */
export const ListAutoWidthPluginDescriptor = () =>
	definePlugin({
		ctor: TListAutoWidthPlugin,
		namespace: 'autoWidth',
		contribution: { events: [...PLUGIN_EVENTS] },
	})
