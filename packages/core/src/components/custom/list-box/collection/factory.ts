import { TListBoxExtension } from './extensions'
import { TDrawExtension, TValueSelectionExtension } from './../../../base'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

/**
 * Детали рабочей коллекции ListBox — по порядку установки. См. `tabsExtensions`.
 *
 * `draw` — что список рисует из показанных элементов: без окна все, а окно ему
 * ставит обёртка `Virtual`. Перед `list`: место элемента в наборе
 * (`aria-posinset`) список пишет по нарисованному.
 */
export function listBoxExtensions(): TExtensionSet<IListBoxItem> {
	return {
		...selectionExtensions<IListBoxItem>(TListBoxItem),
		// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы объявлен,
		// но мёртв
		value: () => new TValueSelectionExtension<IListBox, IListBoxItem>(),
		draw: () => new TDrawExtension<IListBoxItem>(),
		list: () => new TListBoxExtension(),
	}
}
