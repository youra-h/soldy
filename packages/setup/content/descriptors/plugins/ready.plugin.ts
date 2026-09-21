/**
 * Определение TReadyPlugin (namespace `ready`) — готовность компонента к работе с DOM.
 *
 * Мост от `TElementPlugin` к `ready` инстанса: узел подключён — `true`, снят — `false`.
 */

import { definePlugin } from '../../../protected/define'
import { TReadyPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const ReadyPluginDescriptor = definePlugin({
	ctor: TReadyPlugin,
	namespace: 'ready',
	contribution: { events: [...PLUGIN_EVENTS] },
})
