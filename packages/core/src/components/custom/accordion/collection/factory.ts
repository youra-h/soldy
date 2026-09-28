import { TAccordionExtension, TAccordionContentExtension } from './extensions'
import { selectionExtensions } from './../../../base/collection/create/internal'
import type { TExtensionSet } from './../../../base/collection/create/internal'
import TAccordionItem from './../item/item.class'
import type { IAccordionItem } from './../item/types'
import type { IAccordion } from './../types'

/**
 * Расширения коллекции Accordion — всё, без чего компонент не работает.
 * Пришедший снаружи движок компонент дособирает этим набором.
 */
export const ACCORDION_EXTENSIONS = (): TExtensionSet<IAccordionItem, IAccordion> => ({
	...selectionExtensions<IAccordionItem>(TAccordionItem),
	content: () => new TAccordionContentExtension<IAccordionItem>(),
	accordion: (owner) => new TAccordionExtension({ owner }),
})
