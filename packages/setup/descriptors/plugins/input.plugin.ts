/**
 * Определение TInputPlugin (namespace `input`) — ввод текста в поле Input.
 *
 * Переносит набранное из `<input>` в `value`, пока поле не `readonly` и не `disabled`.
 */

import { definePlugin } from '../../define'
import { TInputPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const InputPluginDescriptor = definePlugin({
	ctor: TInputPlugin,
	namespace: 'input',
	contribution: { events: [...PLUGIN_EVENTS] },
})
