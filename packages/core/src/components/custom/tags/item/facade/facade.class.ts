import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TTagsCollectionExtensions, TTagsAdapters } from '../../collection/types'
import type { ITagsItem } from '../types'

/**
 * Фасад элемента Tags.
 *
 * `selected` и `order` — из базы (`TSelectionItemFacade`). Своё — только
 * `closable`: резолв «элемент ?? владелец» делает `TTagsItemExtension`, фасад
 * лишь читает готовый результат — как `closable` у `TTabsItemCollectionFacade`.
 */
export class TTagsItemCollectionFacade extends TSelectionItemFacade<
	ITagsItem,
	TTagsCollectionExtensions
> {
	override setContext(context: TItemContext<ITagsItem, TTagsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._tagsAdapters.tags.events, ['change:closable'])
	}

	get closable(): boolean {
		return this._context ? this._tagsAdapters.tags.closable : false
	}

	private get _tagsAdapters(): TTagsAdapters {
		return this._context?.adapters as unknown as TTagsAdapters
	}
}
