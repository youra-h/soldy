import type { TItemContext } from '../../../../base/collection'
import { TListItemCollectionFacade } from '../../../list/item/facade'
import type { TListBoxCollectionExtensions, TListBoxAdapters } from '../../collection/types'
import type { IListBoxItem } from '../types'
import type { TListBoxView } from '../../types'

/**
 * Фасад элемента listBox.
 *
 * Наследует `TListItemCollectionFacade` (`selected`, `order`, `wordWrap`) и
 * добавляет `view`.
 */
export class TListBoxItemCollectionFacade extends TListItemCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions
> {
	override setContext(context: TItemContext<IListBoxItem, TListBoxCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		// `change:view` не попадает в тип эмиттера: набор событий вшит в
		// `IListItemExtension` и наследником не расширяется — см. комментарий
		// там же. Приведение только здесь; `view` ниже уже типизирован.
		this.events.relay(this._listBoxAdapters.list.events as any, ['change:view'])
	}

	get view(): TListBoxView {
		return this._context ? this._listBoxAdapters.list.view : 'plain'
	}

	private get _listBoxAdapters(): TListBoxAdapters {
		return this._context?.adapters as unknown as TListBoxAdapters
	}
}
