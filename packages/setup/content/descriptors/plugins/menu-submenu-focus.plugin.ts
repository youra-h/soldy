/**
 * Определение TMenuSubmenuFocusPlugin (namespace `focus`) — модель фокуса
 * подменю.
 *
 * Открыли клавишей — фокус на первом пункте, указателем — остаётся на строке;
 * Escape закрывает один уровень и возвращает фокус на строку пункта; Tab
 * закрывает всё меню — о нём подменю сообщает меню над собой, см.
 * `TMenuSubmenuFocusPlugin`. Ставится после `TDismissPlugin` и клавиатуры:
 * берёт у них панель, `dismiss` и строку подсвеченного.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuSubmenuFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuSubmenuFocusPluginDescriptor = definePlugin({
	ctor: TMenuSubmenuFocusPlugin,
	namespace: 'focus',
	/**
	 * Наружу — только `create`: фокус — операция над DOM, а не значение, а
	 * `tab` слушает меню над подменю у его набора, а не потребитель.
	 */
	contribution: { events: [...PLUGIN_EVENTS] },
})
