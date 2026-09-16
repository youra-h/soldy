import { TSelectionItemFacade } from '../../../../base/collection'
import type { TItemContext } from '../../../../base/collection'
import type { TAriaAttributes } from '../../../../../common'
import type {
	TAccordionCollectionExtensions,
	TAccordionItemCollectionFacadeEvents,
} from '../../collection/types'
import type { IAccordionItem } from '../types'
import type { TAccordionView } from '../../types'

/**
 * Фасад элемента accordion.
 *
 * `selected` и `order` — из базы; своё — вид и сторона панели. Используется
 * как `ctor` в `AccordionCollectionItemDescriptor`.
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

	get view(): TAccordionView {
		return this._context?.adapters.accordion.view ?? 'plain'
	}

	/**
	 * Сторона панели: роль, `id` и ссылка на заголовок.
	 *
	 * Осталась пропом, в отличие от стороны заголовка: та пишется прямо в
	 * `aria` элемента, а у панели Accordion своего компонента нет — она лежит
	 * внутри элемента, и набора, в который можно писать, у неё не существует.
	 */
	get content_aria(): TAriaAttributes {
		return this._context?.adapters.content.contentAria ?? {}
	}
}
