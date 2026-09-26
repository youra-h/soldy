/**
 * Определение TTagsScrollPlugin (namespace `scroll`) — доводка элемента под фокусом в ряду тегов `scroll`.
 *
 * Фокус с клавиатуры у края ряда браузер оставляет срезанным, и тег под ним
 * в окно ряда доводит плагин. Слушает, только пока ряд прокручивается сам
 * (`overflow: 'scroll'`). Своих пропсов у плагина нет: окно ряда задаёт тема
 * (`scroll-padding`).
 */

import { definePlugin } from '../../../protected/define'
import { TTagsScrollPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TagsScrollPluginDescriptor = definePlugin({
	ctor: TTagsScrollPlugin,
	namespace: 'scroll',
	contribution: { events: [...PLUGIN_EVENTS] },
})
