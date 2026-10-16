/**
 * Определение TPaginationFocusPlugin (namespace `focus`) — фокус со стрелки,
 * погасшей под ним у края, на текущую страницу.
 *
 * Без плагина выключенная стрелка теряет фокус, и браузер сбрасывает его в
 * начало документа. Подключается после плагинов коллекции — берёт у них
 * движок и узлы страниц. Своих пропсов и выходов нет.
 */

import { definePlugin } from '../../../protected/define'
import { TPaginationFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const PaginationFocusPluginDescriptor = definePlugin({
	ctor: TPaginationFocusPlugin,
	namespace: 'focus',
	contribution: { events: [...PLUGIN_EVENTS] },
})
