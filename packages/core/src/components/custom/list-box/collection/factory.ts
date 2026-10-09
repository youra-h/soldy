import { TListBoxExtension } from './extensions'
import { TDrawExtension, TPositionInSetExtension, TValueSelectionExtension } from './../../../base'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

/**
 * Детали рабочей коллекции ListBox — по порядку установки. См. `tabsExtensions`.
 *
 * `draw` — что список рисует из показанных элементов: без окна все, а окно ему
 * ставит обёртка `Virtual`. Сразу за ним `positionInSet`: место элемента в
 * наборе (`aria-posinset`) пишется по нарисованному — то же у Select.
 */
export function listBoxExtensions(): TExtensionSet<IListBoxItem> {
	return {
		...selectionExtensions<IListBoxItem>(TListBoxItem),
		// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы объявлен,
		// но мёртв
		value: () => new TValueSelectionExtension<IListBox, IListBoxItem>(),
		draw: () => new TDrawExtension<IListBoxItem>(),
		positionInSet: () => new TPositionInSetExtension<IListBoxItem>(),
		list: () => new TListBoxExtension(),
	}
}
