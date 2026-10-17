/**
 * Определение TMenuPointerPlugin (namespace `pointer`) — указатель меню.
 *
 * Клик по корню, в котором лежит только триггер, переключает `open`; пока
 * меню открыто, мышь и перо над пунктом подсвечивают его, см.
 * `TMenuPointerPlugin`. Ставится после клавиатуры: подсвечивает через неё.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuPointerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuPointerPluginDescriptor = definePlugin({
	ctor: TMenuPointerPlugin,
	namespace: 'pointer',
	/**
	 * Ничего не отдаёт наружу: открытость (`open`) читается как проп владельца,
	 * подсветка — `data-highlighted` пункта.
	 */
	contribution: { events: [...PLUGIN_EVENTS] },
})
