import { definePlugin } from '../base'
import { TSelectKeyboardPlugin } from '@soldy/plugins'
import type { ISelectKeyboardPluginOptions, TSelectKeyboardPluginEvents } from '@soldy/plugins'
import { SelectKeyboardContribution } from '../../contributions'

/**
 * Клавиатурная модель APG Combobox (select-only): открытие, навигация с
 * пропуском недоступных опций, Home/End, Escape, набор по буквам.
 */
export const SelectKeyboardPluginDescriptor = (options?: ISelectKeyboardPluginOptions) =>
	definePlugin<'keyboard', TSelectKeyboardPluginEvents>({
		ctor: TSelectKeyboardPlugin,
		namespace: 'keyboard',
		contribution: SelectKeyboardContribution(),
		options,
	})
