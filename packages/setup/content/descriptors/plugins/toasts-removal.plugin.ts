/**
 * Определение TToastsRemovalPlugin (namespace `removal`) — закрытый тост
 * уходит из коллекции, когда его узел доиграл переходы.
 *
 * Пропсов нет: закрытие сообщает коллекция (`item:close`), а сколько гаснет
 * тост, решает переход темы.
 */

import { definePlugin } from '../../../protected/define'
import { TToastsRemovalPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ToastsRemovalPluginDescriptor = definePlugin({
	ctor: TToastsRemovalPlugin,
	namespace: 'removal',
	contribution: { events: [...PLUGIN_EVENTS] },
})
