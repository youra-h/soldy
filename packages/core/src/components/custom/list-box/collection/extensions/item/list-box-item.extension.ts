import type { IListBoxItemExtension } from './types'
import type { IListBoxItem } from '../../../list-box-item/types'
import type { IListBoxExtension } from '../types'
import type { TListBoxView } from '../../../types'
import { TListItemExtension } from '../../../../list'

/**
 * TListBoxItemExtension — stateless-делегат элемента ListBox.
 *
 * Наследует TListItemExtension (wordWrap) и добавляет view (владелец).
 *
 * @template TItem   — тип элемента (IListBoxItem или наследник)
 * @template TParent — тип родительского расширения (IListBoxExtension или наследник)
 */
export class TListBoxItemExtension<
	TItem extends IListBoxItem = IListBoxItem,
	TParent extends IListBoxExtension<TItem> = IListBoxExtension<TItem>,
>
	extends TListItemExtension<TItem, TParent>
	implements IListBoxItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:view'])
	}

	/**
	 * Внешний вид элемента.
	 * Берётся из родительского расширения (TListBox).
	 */
	get view(): TListBoxView {
		return this._parent.view
	}
}
