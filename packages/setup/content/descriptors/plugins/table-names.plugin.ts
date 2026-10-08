/**
 * Определение TTableNamesPlugin (namespace `names`) — имя чекбокса «выбрать
 * все» таблицы от локали.
 *
 * Выход `names_selectAll`: шаблон отдаёт его чекбоксу шапки колонки выбора
 * пропом `aria_label` — своего текста у ячейки нет.
 */

import { definePlugin } from '../../../protected/define'
import { TTableNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TableNamesPluginDescriptor = definePlugin({
	ctor: TTableNamesPlugin,
	namespace: 'names',
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			selectAll: { protected: true, triggers: ['change:selectAll'] },
		},
	},
})
