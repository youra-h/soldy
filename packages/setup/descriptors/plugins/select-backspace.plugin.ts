import { definePlugin } from '../../define'
import { TSelectBackspacePlugin } from '@soldy/plugins'
import type { TSelectBackspacePluginEvents } from '@soldy/plugins'
import { SelectBackspaceContribution } from '../../contributions'

/**
 * Удаление выбранных тегов по `Backspace` в пустом поле Select
 * (`editable` + `multiple`, `removeOnBackspace`). Подключается после
 * `SelectEditablePluginDescriptor()` — тем же порядком, что и остальные
 * реакции на клавиатуру и ввод, хотя от них не зависит.
 */
export const SelectBackspacePluginDescriptor = () =>
	definePlugin<'backspace', TSelectBackspacePluginEvents>({
		ctor: TSelectBackspacePlugin,
		namespace: 'backspace',
		contribution: SelectBackspaceContribution(),
	})
