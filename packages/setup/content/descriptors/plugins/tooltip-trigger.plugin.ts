/**
 * Определение TTooltipTriggerPlugin (namespace `trigger`) — когда подсказка
 * показывается и когда прячется.
 *
 * Наведение с задержкой, фокус с клавиатуры, нажатие и Escape ведут `open`
 * владельца, см. `TTooltipTriggerPlugin`. Ставится после `TDismissPlugin`:
 * берёт у него панель.
 */

import { definePlugin } from '../../../protected/define'
import { TTooltipTriggerPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TooltipTriggerPluginDescriptor = definePlugin({
	ctor: TTooltipTriggerPlugin,
	namespace: 'trigger',
	/**
	 * Ничего не отдаёт наружу: открытость (`open`) и задержки — пропсы
	 * владельца. Контрибуция нужна лишь для того, чтобы `create` попал в
	 * события, как у любого плагина.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
	},
})
