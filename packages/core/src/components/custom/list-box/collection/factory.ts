import { TListBoxExtension } from './extensions'
import { TValueSelectionExtension } from './../../../base'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

/**
 * Расширения коллекции ListBox — всё, без чего компонент не работает.
 * Пришедший снаружи движок компонент дособирает этим набором.
 */
export const LIST_BOX_EXTENSIONS = (): TExtensionSet<IListBoxItem, IListBox> => ({
	...selectionExtensions<IListBoxItem>(TListBoxItem),
	// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы объявлен,
	// но мёртв
	value: (owner) => new TValueSelectionExtension({ owner }),
	list: (owner) => new TListBoxExtension({ owner }),
})
