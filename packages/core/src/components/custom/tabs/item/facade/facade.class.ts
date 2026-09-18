import { TActivationItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TTabsCollectionExtensions,
	TTabsItemCollectionFacadeEvents,
} from '../../collection/types'
import type { ITabsItem } from '../types'

/**
 * Фасад элемента таба.
 *
 * `active` и `order` — из `TActivationItemFacade`: у таба активность, а не
 * выбор. Своё — только `closable`.
 */
export class TTabsItemCollectionFacade extends TActivationItemFacade<
	ITabsItem,
	TTabsCollectionExtensions,
	TTabsItemCollectionFacadeEvents
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.tabs.events)
	}

	get closable(): boolean {
		return this._context?.adapters.tabs.closable ?? false
	}
}
