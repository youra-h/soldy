/**
 * Определение TRatingNamesPlugin (namespace `names`) — как звучит оценка:
 * `aria-valuetext` поля от локали, «4 из 5».
 *
 * Пропсов нет: плагин пишет в набор `aria` оценки, а его разметка
 * раскладывает на поле.
 */

import { definePlugin } from '../../../protected/define'
import { TRatingNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const RatingNamesPluginDescriptor = definePlugin({
	ctor: TRatingNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
