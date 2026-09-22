/**
 * Определение TScrollLockPlugin (namespace `scrollLock`) — страница под
 * открытым оверлеем не прокручивается.
 *
 * Ставится адресно, тому, кто перехватывает работу со страницей: модальному
 * окну и выезжающей панели. Немодальному оверлею (Popover, список Select)
 * запирать прокрутку нельзя — страница за его панелью остаётся рабочей.
 */

import { definePlugin } from '../../../protected/define'
import { TScrollLockPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ScrollLockPluginDescriptor = definePlugin({
	ctor: TScrollLockPlugin,
	namespace: 'scrollLock',
	/**
	 * `enabled` пишется снаружи, как у `TDismissPlugin`: обычно замок ведёт
	 * сам плагин по открытости владельца, но потребителю нужен и ручной путь
	 * — и выключить замок там, где прокрутка фона допустима.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			enabled: { type: Boolean, triggers: ['change:enabled'] },
		},
	},
})
