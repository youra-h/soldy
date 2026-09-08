import { TBaseItemExtension } from '../../../../../../base/collection'
import type { IAccordionItemExtension, TAccordionItemEventsExtension } from './types'
import type { IAccordionItem } from '../../../../item/types'
import type { IAccordionExtension } from '../types'
import type { TAccordionView } from '../../../../types'
/**
 * TAccordionItemExtension — stateless-делегат элемента accordion.
 *
 * Предоставляет view, резолвя его из родительского расширения (TAccordion.view).
 *
 * @template TItem   — тип элемента (IAccordionItem или наследник)
 * @template TParent — тип родительского расширения (IAccordionExtension или наследник)
 */
export class TAccordionItemExtension<
	TItem extends IAccordionItem = IAccordionItem,
	TParent extends IAccordionExtension<TItem> = IAccordionExtension<TItem>,
>
	extends TBaseItemExtension<TItem, TParent, TAccordionItemEventsExtension>
	implements IAccordionItemExtension<TItem>
{
	constructor(item: TItem, parent: TParent) {
		super(item, parent)

		this.events.relay(parent.events, ['change:view'])
	}

	/**
	 * Внешний вид элемента.
	 * Берётся из родительского расширения (TAccordion).
	 */
	get view(): TAccordionView {
		return this._parent.view
	}
}
