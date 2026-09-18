import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TTagsCollectionExtensions,
	TTagsItemCollectionFacadeEvents,
} from '../../collection/types'
import type { ITagsItem } from '../types'

/**
 * Фасад элемента Tags.
 *
 * `selected` и `order` — из базы (`TSelectionItemFacade`). Своё — `closable`
 * (резолв «не выключен и (элемент ?? владелец)» делает `TTagsItemExtension`,
 * фасад лишь читает готовый результат — как `closable` у
 * `TTabsItemCollectionFacade`).
 */
export class TTagsItemCollectionFacade extends TSelectionItemFacade<
	ITagsItem,
	TTagsCollectionExtensions,
	TTagsItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITagsItem, TTagsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.tags.events)
	}

	get closable(): boolean {
		return this._context?.adapters.tags.closable ?? false
	}
}
