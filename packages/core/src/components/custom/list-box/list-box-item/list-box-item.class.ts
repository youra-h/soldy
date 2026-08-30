import { TListItem } from '../../list'

/**
 * Элемент ListBox.
 * Наследует TListItem (text, wordWrap) — view наследуется от TListBox через item-адаптер.
 */
export default class TListBoxItem extends TListItem {
	static override baseClass = 's-list-box-item'
}
