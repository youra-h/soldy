import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext, IExtension } from '../../../../base/collection'
import type { TListCollectionExtensions, TListAdapters } from '../../collection/types'
import type { IListItem } from '../types'

/**
 * Фасад элемента list.
 *
 * `selected` и `order` — из базы; своё — только перенос текста. Базовый фасад
 * для ListBox, как и на стороне коллекции.
 */
export class TListItemCollectionFacade<
	TItem extends IListItem = IListItem,
	TExtensions extends Record<string, IExtension<any>> = TListCollectionExtensions,
> extends TSelectionItemFacade<TItem, TExtensions> {
	override setContext(context: TItemContext<TItem, TExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._listAdapters.list.events, ['change:wordWrap'])
	}

	get wordWrap(): boolean {
		return this._context ? this._listAdapters.list.wordWrap : false
	}

	protected get _listAdapters(): TListAdapters<TItem> {
		return this._context?.adapters as unknown as TListAdapters<TItem>
	}
}
