/**
 * Определение TRatingHoverPlugin (namespace `hover`) — наведение на оценку.
 *
 * Переводит точку указателя в долю ряда звёзд и зовёт `hover` владельца:
 * оценка показывает ту, которую поставит нажатие под указателем. Своих
 * пропсов и выходов у плагина нет: предпросмотр — состояние владельца
 * (`preview`), его звёзды и показывают.
 */

import { definePlugin } from '../../../protected/define'
import { TRatingHoverPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const RatingHoverPluginDescriptor = definePlugin({
	ctor: TRatingHoverPlugin,
	namespace: 'hover',
	contribution: { events: [...PLUGIN_EVENTS] },
})
