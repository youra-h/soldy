/**
 * Определение TTagsNamesPlugin (namespace `names`) — имя кнопки «…» набора
 * тегов от локали.
 *
 * В набор кнопки (`moreAria`) плагин пишет сам. Выход `names_more` — то же
 * имя для панели, которую кнопка открывает: шаблон отдаёт его панели пропом
 * `aria_label`.
 */

import { definePlugin } from '../../../protected/define'
import { TTagsNamesPlugin, PLUGIN_EVENTS } from '@soldy-ui/plugins'

export const TagsNamesPluginDescriptor = definePlugin({
	ctor: TTagsNamesPlugin,
	namespace: 'names',
	contribution: {
		events: [...PLUGIN_EVENTS],
		props: {
			more: { protected: true, triggers: ['change:more'] },
		},
	},
})
