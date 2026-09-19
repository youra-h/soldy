/**
 * Определение TPopoverPointerPlugin (namespace `pointer`) — клик по триггеру Popover.
 *
 * Клик по корню, в котором лежит только триггер, переключает `open`, см.
 * `TPopoverPointerPlugin`.
 */

import { definePlugin } from '../../define'
import { TPopoverPointerPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TPopoverPointerPluginEvents } from '@soldy/plugins'

export const PopoverPointerPluginDescriptor = () =>
	definePlugin<'pointer', TPopoverPointerPluginEvents>({
		ctor: TPopoverPointerPlugin,
		namespace: 'pointer',
		/**
		 * Ничего не отдаёт наружу: открытость (`open`) читается как проп владельца.
		 * Контрибуция нужна лишь для того, чтобы `create` попал в события, как у
		 * любого плагина.
		 */
		contribution: {
			events: [...PLUGIN_EVENTS],
		},
	})
