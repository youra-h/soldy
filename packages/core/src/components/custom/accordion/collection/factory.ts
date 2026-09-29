import { TAccordionExtension, TAccordionContentExtension } from './extensions'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TAccordionItem from './../item/item.class'
import type { IAccordionItem } from './../item/types'
import type { IAccordion } from './../types'

/**
 * Детали рабочей коллекции Accordion — по порядку установки. См. `tabsExtensions`.
 * `content` ищет `selection` в своём `install` и стоит после него.
 */
export function accordionExtensions(owner?: IAccordion): TExtensionSet<IAccordionItem> {
	const set: TExtensionSet<IAccordionItem> = {
		...selectionExtensions<IAccordionItem>(TAccordionItem),
		content: () => new TAccordionContentExtension<IAccordionItem>(),
	}

	if (owner) set.accordion = () => new TAccordionExtension({ owner })

	return set
}
