import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type {
	TAccordionCollectionExtensions,
	TAccordionItemCollectionFacadeEvents,
} from '../../collection/types'
import type { IAccordionItem } from '../types'
import type { TAccordionView } from '../../types'

/**
 * Фасад элемента accordion.
 *
 * `selected` и `order` — из базы; своё — вид. Используется как `ctor` в
 * `AccordionCollectionItemDescriptor`.
 */
export class TAccordionItemCollectionFacade extends TSelectionItemFacade<
	IAccordionItem,
	TAccordionCollectionExtensions,
	TAccordionItemCollectionFacadeEvents
> {
	override setContext(
		context: TItemContext<IAccordionItem, TAccordionCollectionExtensions>,
	): void {
		super.setContext(context)

		if (!this._context) return

		this.events.relayAll(this._context.adapters.accordion.events)
	}

	get view(): TAccordionView | undefined {
		return this._context?.adapters.accordion.view
	}
}
