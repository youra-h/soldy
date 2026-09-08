import { TOrderItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TTabsCollectionExtensions } from '../../collection/types'
import type { ITabsItem } from '../types'

/**
 * Фасад элемента таба.
 *
 * Наследует `TOrderItemFacade`, а не базу выбора: у таба активность, а не
 * выбор, — разные расширения и разная семантика. Совпадает у них только
 * порядок, он и вынесен вниз.
 */
export class TTabsItemCollectionFacade extends TOrderItemFacade<
	ITabsItem,
	TTabsCollectionExtensions
> {
	override setContext(context: TItemContext<ITabsItem, TTabsCollectionExtensions>): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relay(this._context.adapters.activation.events, ['change:active'])
		this.events.relay(this._context.adapters.tabs.events, ['change:closable'])
	}

	get active(): boolean {
		return this._context?.adapters.activation.active ?? false
	}

	set active(value: boolean) {
		if (this._context) {
			this._context.adapters.activation.active = value
		}
	}

	get closable(): boolean {
		return this._context?.adapters.tabs.closable ?? false
	}
}
