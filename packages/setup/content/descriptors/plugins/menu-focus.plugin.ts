/**
 * Определение TMenuFocusPlugin (namespace `focus`) — модель фокуса меню.
 *
 * Немодальная, как у Popover: фокус уходит в панель при открытии — на строку
 * подсвеченного пункта, без подсветки на саму панель — и возвращается на
 * триггер при закрытии, Escape закрывает, Tab закрывает и ведёт дальше по
 * странице, см. `TMenuFocusPlugin`. Ставится после `TDismissPlugin` и
 * клавиатуры: берёт у них панель, `dismiss` и строку подсвеченного.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuFocusPluginDescriptor = definePlugin({
	ctor: TMenuFocusPlugin,
	namespace: 'focus',
	/**
	 * Ничего не отдаёт наружу: фокус — операция над DOM, а не значение.
	 * Контрибуция нужна лишь для того, чтобы `create` попал в события, как у
	 * любого плагина.
	 */
	contribution: { events: [...PLUGIN_EVENTS] },
})
