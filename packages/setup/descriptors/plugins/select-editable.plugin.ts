import { definePlugin } from '../base'
import { TEditablePlugin } from '@soldy/plugins'
import type { TEditablePluginEvents } from '@soldy/plugins'
import { SelectEditableContribution } from '../../contributions'

/**
 * Реакция на ввод текста в поле Select при `editable: true` — три состояния
 * задаёт `editableMode` (см. `TSelect`). Подключается после
 * `SelectKeyboardPluginDescriptor()`: плагину нужна уже установленная
 * клавиатура, чтобы переиспользовать её `highlightByText`.
 */
export const SelectEditablePluginDescriptor = () =>
	definePlugin<'editable', TEditablePluginEvents>({
		ctor: TEditablePlugin,
		namespace: 'editable',
		contribution: SelectEditableContribution(),
	})
