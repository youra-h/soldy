/**
 * Определение TPopoverFocusPlugin (namespace `focus`) — модель фокуса Popover.
 *
 * Фокус уходит в панель при открытии и возвращается при закрытии, Escape
 * закрывает, Tab ходит так, будто панель стоит за триггером, см.
 * `TPopoverFocusPlugin`. Ставится после `TDismissPlugin`: берёт у него панель и
 * событие `dismiss`.
 */

import { definePlugin } from '../../../protected/define'
import { TPopoverFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const PopoverFocusPluginDescriptor = definePlugin({
	ctor: TPopoverFocusPlugin,
	namespace: 'focus',
	/**
	 * Ничего не отдаёт наружу: фокус — операция над DOM, а не значение.
	 * Контрибуция нужна лишь для того, чтобы `create` попал в события, как у
	 * любого плагина.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
	},
})
