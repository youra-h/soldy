/**
 * Определение TSelectKeyboardPlugin (namespace `keyboard`) — клавиатура Select.
 *
 * Клавиатурная модель APG Combobox (select-only): открытие, навигация с
 * пропуском недоступных опций, Home/End, Escape, набор по буквам.
 *
 * Наружу уходит не вся карта событий плагина (`TSelectKeyboardPluginEvents`):
 * contribution отдаёт только подсветку, а `escape` плагин шлёт внутри bundle —
 * его слушает `TEditablePlugin`. Типы дескриптора выводятся из того же
 * contribution, поэтому `keyboard:escape` в них нет, как и в пробросе адаптера.
 */

import { definePlugin } from '../../define'
import { TSelectKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'

export const SelectKeyboardPluginDescriptor = definePlugin({
	ctor: TSelectKeyboardPlugin,
	namespace: 'keyboard',
	/**
	 * Клавиатура поля выбора.
	 *
	 * Наружу отдаётся только подсветка — она нужна разметке, чтобы отличить
	 * опцию под навигацией от выбранной. Всё остальное плагин делает сам.
	 */
	contribution: {
		events: [...PLUGIN_EVENTS, 'change:highlight'],
		props: {
			highlightedUid: { protected: true, triggers: ['change:highlight'] },
		},
	},
})
