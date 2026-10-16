/**
 * Определение TPaginationNamesPlugin (namespace `names`) — имена стрелок
 * пагинации от локали.
 *
 * Пропсов нет: плагин пишет в наборы стрелок (`prevAria`, `nextAria`), а их
 * разметка уже раскладывает. Ряду имени он не пишет: его даёт приложение
 * (`aria_label`, `aria_labelledBy`).
 */

import { definePlugin } from '../../../protected/define'
import { TPaginationNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const PaginationNamesPluginDescriptor = definePlugin({
	ctor: TPaginationNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
