/**
 * Определение TModalFocusPlugin (namespace `focus`) — модель фокуса
 * модального оверлея.
 *
 * Фокус уходит в панель при открытии и возвращается при закрытии, Escape
 * закрывает, Tab замкнут в панели, см. `TModalFocusPlugin`. Неймспейс тот же,
 * что у немодальной модели (`popover-focus.plugin.ts`): у компонента она
 * одна, а какая именно — решает его дескриптор.
 */

import { definePlugin } from '../../../protected/define'
import { TModalFocusPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const ModalFocusPluginDescriptor = definePlugin({
	ctor: TModalFocusPlugin,
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
