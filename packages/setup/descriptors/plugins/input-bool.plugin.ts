/**
 * Определение TInputBoolPlugin (namespace `input-bool`) — `<input>` CheckBox и Switch.
 *
 * Переключает значение по `change` вложенного поля и глушит клик при `readonly`.
 */

import { definePlugin } from '../../define'
import { TInputBoolPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const InputBoolPluginDescriptor = definePlugin({
	ctor: TInputBoolPlugin,
	namespace: 'input-bool',
	contribution: { events: [...PLUGIN_EVENTS] },
})
