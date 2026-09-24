/**
 * Определение THideOutsidePlugin (namespace `hideOutside`) — фон под
 * открытым оверлеем спрятан от скринридера.
 *
 * Ставится адресно, модальному окну: вместе с `TModalFocusPlugin` он и
 * делает окно модальным — фокус замкнут в панели, а скринридер не читает то,
 * с чем сейчас работать нельзя. Немодальному оверлею (Popover, список Select)
 * фон прятать нельзя — страница за его панелью остаётся рабочей.
 */

import { definePlugin } from '../../../protected/define'
import { THideOutsidePlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const HideOutsidePluginDescriptor = definePlugin({
	ctor: THideOutsidePlugin,
	namespace: 'hideOutside',
	/**
	 * `enabled` пишется снаружи, как у `TScrollLockPlugin`: обычно фон прячет
	 * сам плагин по открытости владельца, но потребителю нужен и ручной путь.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			enabled: { type: Boolean, triggers: ['change:enabled'] },
		},
	},
})
