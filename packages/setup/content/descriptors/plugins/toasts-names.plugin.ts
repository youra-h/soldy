/**
 * Определение TToastsNamesPlugin (namespace `names`) — имя региона тостов от
 * локали («Уведомления (F8)»).
 *
 * Пропсов нет: плагин пишет в `aria` владельца, а разметка уже раскладывает.
 */

import { definePlugin } from '../../../protected/define'
import { TToastsNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ToastsNamesPluginDescriptor = definePlugin({
	ctor: TToastsNamesPlugin,
	namespace: 'names',
	contribution: { events: [...PLUGIN_EVENTS] },
})
