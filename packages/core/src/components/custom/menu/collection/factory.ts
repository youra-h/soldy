import { TMenuExtension } from './extensions'
import { TSelectionExtension } from './../../../base/collection'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TMenuItem from './../item/item.class'
import type { IMenuItem } from './../item/types'

/**
 * Детали рабочей коллекции меню — по порядку установки. См. `tabsExtensions`.
 *
 * `selection.mode` — `'multiple'`, а не `'single'` из `TSelectionExtension`:
 * выбор у меню — отметки флажков, и каждый флажок отмечается сам по себе.
 * Переопределение только здесь, дефолт самого расширения не трогаем; движок,
 * пришедший снаружи со своим выбором, в тот же режим переводит фасад.
 *
 * `draw` нет: меню рисует свои пункты все, окна у него не бывает.
 */
export function menuExtensions(): TExtensionSet<IMenuItem> {
	return {
		...selectionExtensions<IMenuItem>(TMenuItem),
		selection: () => {
			const selection = new TSelectionExtension<IMenuItem>()

			selection.mode = 'multiple'

			return selection
		},
		menu: () => new TMenuExtension(),
	}
}
