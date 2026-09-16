import { definePlugin } from '../base'
import { TSelectKeyboardPlugin } from '@soldy/plugins'
import type { ISelectKeyboardPluginOptions, TListNavigationPluginEvents } from '@soldy/plugins'
import { SelectKeyboardContribution } from '../../contributions'

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
	definePlugin<'keyboard', TListNavigationPluginEvents>({
		ctor: TSelectKeyboardPlugin,
		namespace: 'keyboard',
		contribution: SelectKeyboardContribution(),
		options,
	})
