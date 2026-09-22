/**
 * Определение TScrollerViewportPlugin (namespace `viewport`) — вьюпорт ленты.
 *
 * Мерит края ленты и остановки Tab внутри, отдаёт замер инстансу и по его
 * просьбе листает. Своих пропсов и выходов у плагина нет: всё, что видно
 * снаружи, — свойства ленты, а плагин их только сообщает.
 */

import { definePlugin } from '../../../protected/define'
import { TScrollerViewportPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ScrollerViewportPluginDescriptor = definePlugin({
	ctor: TScrollerViewportPlugin,
	namespace: 'viewport',
	contribution: { events: [...PLUGIN_EVENTS] },
})
