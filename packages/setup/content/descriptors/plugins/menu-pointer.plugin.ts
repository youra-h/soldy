/**
 * Определение TMenuPointerPlugin (namespace `pointer`) — открытие и указатель
 * меню.
 *
 * Открывает меню по способу владельца (`openOn`): у кнопки клик по корню, в
 * котором лежит только триггер, переключает `open`, у контекстного меню —
 * `contextmenu` и долгое касание над областью открывают его у точки вызова.
 * Пока меню открыто, мышь и перо над пунктом подсвечивают его, см.
 * `TMenuPointerPlugin`. Ставится после клавиатуры: открывает и подсвечивает
 * через неё.
 */

import { definePlugin } from '../../../protected/define'
import { TMenuPointerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const MenuPointerPluginDescriptor = definePlugin({
	ctor: TMenuPointerPlugin,
	namespace: 'pointer',
	/**
	 * Ничего не отдаёт наружу: открытость (`open`) и точка вызова (`point`)
	 * читаются как пропсы владельца, подсветка — `data-highlighted` пункта.
	 */
	contribution: { events: [...PLUGIN_EVENTS] },
})
