/**
 * Определение TMenuHoverPlugin (namespace `hover`) — указатель в панели
 * уровня меню: корня или подменю.
 *
 * Пока меню открыто, мышь и перо над пунктом подсвечивают его, а над пунктом
 * со своей панелью — подменю или пунктом с панелью, — простояв, открывают
 * панель, и фокус остаётся на строке; путь указателя к открытой панели её не
 * закрывает, см. `TMenuHoverPlugin`. Ставится после клавиатуры уровня:
 * подсвечивает через неё.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuHoverPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuHoverPluginDescriptor = definePlugin({
	ctor: TMenuHoverPlugin,
	namespace: 'hover',
	/**
	 * Ничего не отдаёт наружу: подсветка — `data-highlighted` пункта,
	 * открытость панели — проп `open` пункта. Контрибуция нужна лишь для того,
	 * чтобы `create` попал в события, как у любого плагина.
	 */
	contribution: { events: [...PLUGIN_EVENTS] },
})
