import { TAccordionExtension } from './extensions'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TAccordionItem from './../item/item.class'
import type { IAccordionItem } from './../item/types'

/**
 * Детали рабочей коллекции Accordion — по порядку установки. См. `tabsExtensions`.
 * `accordion` ищет `selection` в своём `install` и стоит после него.
 */
export function accordionExtensions(): TExtensionSet<IAccordionItem> {
	return {
		...selectionExtensions<IAccordionItem>(TAccordionItem),
		accordion: () => new TAccordionExtension(),
	}
}
