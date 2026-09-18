import { definePlugin } from '../../define'
import { TSelectBackspacePlugin, PLUGIN_EVENTS } from '@soldy/plugins'
import type { TSelectBackspacePluginEvents } from '@soldy/plugins'

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
		/**
		 * Удаление тегов по `Backspace` в пустом поле Select.
		 *
		 * Ничего не отдаёт наружу: включает ли механизм состояние, целиком читается
		 * через `owner.removeOnBackspace`. Контрибуция нужна лишь для того, чтобы
		 * `create` попал в события, как и у любого плагина.
		 */
		contribution: {
			events: [...PLUGIN_EVENTS],
		},
	})
