/**
 * Определение TSelectPointerPlugin (namespace `pointer`) — клик по полю Select.
 *
 * Select-only тумблит панель кликом по всему полю, editable — только кликом по
 * стрелке; выбор поведения переключается по `change:editable`, см.
 * `TSelectPointerPlugin`.
 */

import { definePlugin } from '../../../protected/define'
import { TSelectPointerPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const SelectPointerPluginDescriptor = definePlugin({
	ctor: TSelectPointerPlugin,
	namespace: 'pointer',
	/**
	 * Клик по полю Select.
	 *
	 * Ничего не отдаёт наружу: и открытость (`open`), и режим (`editable`) уже
	 * читаются как пропы владельца. Контрибуция нужна лишь для того, чтобы
	 * `create` попал в события, как и у любого плагина.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS],
	},
})
