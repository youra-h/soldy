import { TBaseItemExtension } from '../../../../../base/collection'
import type { IListBoxItemExtension, TListBoxItemEventsExtension } from './types'
import type { IListBoxItem } from '../../../list-box-item/types'
import type { IListBoxExtension } from '../types'

/**
 * TListBoxItemExtension — stateless-делегат элемента ListBox.
 *
 * Предоставляет wordWrap (элемент ?? владелец) и view (владелец).
 *
 * @template TItem   — тип элемента (IListBoxItem или наследник)
 * @template TParent — тип родительского расширения (IListBoxExtension или наследник)
 */
export class TListBoxItemExtension<
	TItem extends IListBoxItem = IListBoxItem,
	TParent extends IListBoxExtension<TItem> = IListBoxExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TListBoxItemEventsExtension>
	implements IListBoxItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:wordWrap', 'change:view'])
	}

	/**
	 * Перенос текста.
	 * Явное значение элемента > глобальное значение из расширения.
	 */
	get wordWrap(): boolean {
		return this._item.wordWrap ?? this._parent.wordWrap
	}

	/**
	 * Внешний вид элемента.
	 * Берётся из родительского расширения (TListBox).
	 */
	get view(): string {
		return this._parent.view
	}
}
