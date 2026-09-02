import type { TItemContext } from '../../../base/collection'
import { TListItemCollectionFacade } from '../../list/list-item/facade'
import type { TListBoxCollectionExtensions } from '../collection/types'
import type { IListBoxItem } from './types'

/**
 * Фасад элемента listBox.
 *
 * Наследует TListItemCollectionFacade (selected, order, wordWrap) и добавляет view.
 */
export class TListBoxItemCollectionFacade extends TListItemCollectionFacade<
	IListBoxItem,
	TListBoxCollectionExtensions
> {
	override setContext(context: TItemContext<IListBoxItem, TListBoxCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		// change:view не объявлен в базовом типе адаптера — приводим вручную.
		this.events.relay(this._context.adapters.list.events as any, ['change:view'])
	}

	get view(): string {
		return this._context?.adapters.list.view ?? ''
	}
}
