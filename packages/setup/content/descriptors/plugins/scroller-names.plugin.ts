/**
 * Определение TScrollerNamesPlugin (namespace `names`) — имена кнопок
 * листания ленты от локали.
 *
 * Пропсов нет: плагин пишет в наборы ленты (`prevAria`, `nextAria`), а их
 * разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TScrollerNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ScrollerNamesPluginDescriptor = definePlugin({
	ctor: TScrollerNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
