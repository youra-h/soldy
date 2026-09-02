import type { TItemContext } from '../../../base/collection'
import { TListItemCollectionFacade } from '../../list/list-item/facade'
import type { TListBoxCollectionExtensions } from '../collection/types'
import type { IListBoxItemExtension } from '../collection/extensions/item/types'
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

		const listBox = this._listAdapter()

		if (listBox) {
			// change:view не объявлен в базовом типе адаптера — приводим вручную.
			this.events.relay(listBox.events as any, ['change:view'])
		}
	}

	get view(): string {
		return this._listAdapter()?.view ?? ''
	}

	protected override _listAdapter(): IListBoxItemExtension<IListBoxItem> | undefined {
		return (this._context?.adapters as unknown as Record<string, any>)?.listBox as
			| IListBoxItemExtension<IListBoxItem>
			| undefined
	}
}
