import { TListBoxExtension } from './extensions'
import {
	TDrawExtension,
	TGroupExtension,
	TPositionInSetExtension,
	TValueSelectionExtension,
} from './../../../base'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TListBoxItem from './../item/item.class'
import type { IListBoxItem } from './../item/types'
import type { IListBox } from './../types'

/**
 * Детали рабочей коллекции ListBox — по порядку установки. См. `tabsExtensions`.
 *
 * `group` — группы элементов из данных: показанное идёт по группам, и список
 * рисует его секциями — группу с подписью, а между группами, если просит
 * `groupSeparators` списка, разделитель. Стоит раньше рисования: на смену
 * показанных рисование берёт уже пересчитанные секции.
 *
 * `draw` — что список рисует из показанных элементов: без окна все, а окно ему
 * ставит обёртка `Virtual`; сгруппированное окно не рисует. Сразу за ним
 * `positionInSet`: место элемента в наборе (`aria-posinset`) пишется по
 * нарисованному — то же у Select.
 */
export function listBoxExtensions(): TExtensionSet<IListBoxItem> {
	return {
		...selectionExtensions<IListBoxItem>(TListBoxItem),
		// Связь `value` ↔ выбор. Без неё проп `value` у ListBox был бы объявлен,
		// но мёртв
		value: () => new TValueSelectionExtension<IListBox, IListBoxItem>(),
		group: () => new TGroupExtension<IListBoxItem>(),
		draw: () => new TDrawExtension<IListBoxItem>(),
		positionInSet: () => new TPositionInSetExtension<IListBoxItem>(),
		list: () => new TListBoxExtension(),
	}
}
