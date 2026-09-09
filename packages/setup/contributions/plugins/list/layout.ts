import type { IContribution } from '@soldy/accessor'
import { PLUGIN_EVENTS } from '@soldy/plugins'

/**
 * Свойства раскладки списка.
 *
 * Объявлены у плагина, а не у компонента, и это не обходной путь: обрабатывает
 * их тот же плагин. Компоненту остаётся подключить его — и свойства появляются,
 * без общего предка. Ровно поэтому их получает и Select, который списком не
 * является.
 *
 * Дескриптор подключает плагин с `flatProps`, поэтому наружу это `maxRows`, а
 * не `layout_maxRows`: для потребителя они неотличимы от собственных пропов
 * компонента. События префикс сохраняют (`layout:create`) — `create` есть у
 * каждого плагина.
 */
export const ListLayoutPluginContribution = (): IContribution => ({
	events: [...PLUGIN_EVENTS],
	props: {
		maxRows: {
			type: Number,
			triggers: ['change:maxRows'],
		},
		wordWrap: {
			type: Boolean,
			triggers: ['change:wordWrap'],
		},
		autoWidth: {
			type: Boolean,
			triggers: ['change:autoWidth'],
		},
		scrollBehavior: {
			type: String,
			triggers: ['change:scrollBehavior'],
		},
	},
})
