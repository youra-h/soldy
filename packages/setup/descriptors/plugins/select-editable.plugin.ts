import { definePlugin } from '../../define'
import { TEditablePlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TEditablePluginEvents } from '@soldy/plugins'

/**
 * Реакция на ввод текста в поле Select при `editable: true` — три состояния
 * задаёт `editableMode` (см. `TSelect`). Подключается после
 * `SelectKeyboardPluginDescriptor()`: плагину нужна уже установленная
 * клавиатура, чтобы переиспользовать её `highlightByText`.
 */
export const SelectEditablePluginDescriptor = () =>
	definePlugin<'editable', TEditablePluginEvents, object, Pick<TEditablePlugin, 'query'>>({
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
