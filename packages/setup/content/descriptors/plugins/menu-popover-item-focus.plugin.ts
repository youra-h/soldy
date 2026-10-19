/**
 * Определение TMenuPopoverItemFocusPlugin (namespace `focus`) — модель фокуса
 * пункта меню с панелью.
 *
 * Открыли — фокус на первой остановке панели, без неё — на самой панели;
 * Escape закрывает панель и возвращает фокус на строку пункта, Shift+Tab с
 * первой остановки — на строку, панель открыта, Tab со строки открытого
 * пункта — в панель, а с последней остановки — из меню: о нём пункт сообщает
 * меню над собой, см. `TMenuPopoverItemFocusPlugin`. Ставится после
 * `TDismissPlugin`: берёт у него панель и `dismiss`.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuPopoverItemFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuPopoverItemFocusPluginDescriptor = definePlugin({
	ctor: TMenuPopoverItemFocusPlugin,
	namespace: 'focus',
	/**
	 * Наружу — только `create`: фокус — операция над DOM, а не значение, а
	 * `tab` слушает меню над пунктом у его набора, а не потребитель.
	 */
	contribution: { events: [...PLUGIN_EVENTS] },
})
