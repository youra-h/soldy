import { definePlugin } from '../../define'
import { TSelectKeyboardPlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { ISelectKeyboardPluginOptions, TListNavigationPluginEvents } from '@soldy/plugins'

/**
 * Клавиатурная модель APG Combobox (select-only): открытие, навигация с
 * пропуском недоступных опций, Home/End, Escape, набор по буквам.
 *
 * Карта событий — опубликованная, а не вся карта плагина
 * (`TSelectKeyboardPluginEvents`): contribution отдаёт наружу только подсветку,
 * а `escape` плагин шлёт внутри bundle — его слушает `TEditablePlugin`. Из этой
 * карты строятся типы дескриптора, и `keyboard:escape` в них не было бы
 * правдой: адаптер его не пробрасывает.
 */
export const SelectKeyboardPluginDescriptor = (options?: ISelectKeyboardPluginOptions) =>
	definePlugin<
		'keyboard',
		TListNavigationPluginEvents,
		object,
		Pick<TSelectKeyboardPlugin, 'highlightedUid'>
	>({
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
		options,
	})
