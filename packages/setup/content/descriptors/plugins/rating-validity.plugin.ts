/**
 * Определение TRatingValidityPlugin (namespace `validity`) — обязательная
 * оценка: пока её не поставили, форма не отправляется.
 *
 * Пропсов нет: обязательна ли оценка, говорит `required` владельца, а ошибку
 * плагин ставит полю сам — у `input[type=range]` нет ни `required`, ни
 * состояния «пусто». Сообщение — строка локали `rating.required`.
 */

import { definePlugin } from '../../../protected/define'
import { TRatingValidityPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const RatingValidityPluginDescriptor = definePlugin({
	ctor: TRatingValidityPlugin,
	namespace: 'validity',
	contribution: { events: [...PLUGIN_EVENTS] },
})
