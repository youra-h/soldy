/**
 * Определение TEditablePlugin (namespace `editable`) — ввод текста в поле Select.
 *
 * Реакция на ввод при `editable: true` — три состояния задаёт `editableMode`
 * (см. `TSelect`). Подключается после `SelectKeyboardPluginDescriptor`:
 * плагину нужна уже установленная клавиатура, чтобы переиспользовать её
 * `highlightByText`.
 */

import { definePlugin } from '../../define'
import { TEditablePlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const SelectEditablePluginDescriptor = definePlugin({
	ctor: TEditablePlugin,
	namespace: 'editable',
	/**
	 * Ввод текста в поле Select при `editable: true`.
	 *
	 * Наружу отдаётся только `query` — то, что сейчас набрано. Реакция
	 * (подсветка через `TSelectKeyboardPlugin`) видна снаружи уже через её
	 * собственный `highlightedUid`, повторять её здесь незачем.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS, 'change:query'],
		props: {
			query: { protected: true, triggers: ['change:query'] },
		},
	},
})
