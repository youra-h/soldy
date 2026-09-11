import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TTagsCollectionExtensions, TTagsAdapters } from '../../collection/types'
import type { ITagsItem } from '../types'
import type { TTagsView } from '../../types'

/**
 * Фасад элемента Tags.
 *
 * `selected` и `order` — из базы (`TSelectionItemFacade`). Своё — `closable`
 * (резолв «элемент ?? владелец» делает `TTagsItemExtension`, фасад лишь читает
 * готовый результат — как `closable` у `TTabsItemCollectionFacade`) и `view`
 * — целиком с набора, как `view` у `TListBoxItemCollectionFacade`.
 */
export class TTagsItemCollectionFacade extends TSelectionItemFacade<
	ITagsItem,
	TTagsCollectionExtensions
> {
	override setContext(context: TItemContext<ITagsItem, TTagsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._tagsAdapters.tags.events, ['change:closable', 'change:view'])
	}

	get closable(): boolean {
		return this._context ? this._tagsAdapters.tags.closable : false
	}

	get view(): TTagsView {
		return this._context ? this._tagsAdapters.tags.view : 'filled'
	}

	private get _tagsAdapters(): TTagsAdapters {
		return this._context?.adapters as unknown as TTagsAdapters
	}
}
