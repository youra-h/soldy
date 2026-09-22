/**
 * Определение TInputControlPlugin (namespace `input-control`) — клик по полю Input.
 *
 * Глушит клик по вложенному `<input>`, пока поле `readonly` или `disabled`.
 */

import { definePlugin } from '../../../protected/define'
import { TInputControlPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const InputControlPluginDescriptor = definePlugin({
	ctor: TInputControlPlugin,
	namespace: 'input-control',
	contribution: { events: [...PLUGIN_EVENTS] },
})
