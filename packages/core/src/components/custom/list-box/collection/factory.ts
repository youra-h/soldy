import { TListBoxExtension } from './extensions'
import { TValueSelectionExtension } from './../../../base'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

/** Детали рабочей коллекции ListBox — по порядку установки. См. `tabsExtensions`. */
export function listBoxExtensions(owner?: IListBox): TExtensionSet<IListBoxItem> {
	const set = selectionExtensions<IListBoxItem>(TListBoxItem)

	if (owner) {
		// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы объявлен,
		// но мёртв
		set.value = () => new TValueSelectionExtension<IListBox, IListBoxItem>({ owner })
		set.list = () => new TListBoxExtension({ owner })
	}

	return set
}
