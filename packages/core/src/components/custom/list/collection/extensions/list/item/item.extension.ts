import { TBaseItemExtension } from '../../../../../../base/collection'
import type { IListItemExtension, TListItemEventsExtension } from './types'
import type { IListItem } from '../../../../item/types'
import type { IListExtension } from '../types'

/**
 * TListItemExtension — stateless-делегат элемента списка.
 *
 * Предоставляет wordWrap, резолвя его из элемента (приоритет) или
 * родительского расширения (fallback на TList.wordWrap).
 *
 * @template TItem   — тип элемента (IListItem или наследник)
 * @template TParent — тип родительского расширения (IListExtension или наследник)
 */
export class TListItemExtension<
	TItem extends IListItem = IListItem,
	TParent extends IListExtension<TItem, any> = IListExtension<TItem>,
	TEvents extends TListItemEventsExtension = TListItemEventsExtension,
>
	extends TBaseItemExtension<TItem, TParent, TEvents>
	implements IListItemExtension<TItem, TEvents>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:wordWrap'])
	}

	/**
	 * Перенос текста.
	 * Явное значение элемента > глобальное значение из расширения.
	 */
	get wordWrap(): boolean {
		return this._item.wordWrap ?? this._parent.wordWrap
	}
}
