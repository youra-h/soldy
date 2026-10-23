/**
 * `<div is="so-accordion-item">` — секция аккордеона. Ряд секций — флексбокс,
 * поэтому номер места (`order`) на корне. docs/architecture.md, Layer 8d,
 * «Коллекция».
 */

import { AccordionCollectionItemDescriptor, AccordionItemDescriptor } from '@soldy-ui/setup'
import type { IAccordionItem, TAccordionItemCollectionFacade } from '@soldy-ui/core'
import { ElementBase } from '../../../adapter'
import type { TElementClassOf, TElementType } from '../../../adapter'
import { accordionItemTemplate } from './accordion-item.template'
import { setupAccordionItem } from './setup.component'

export const TAccordionItemElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof AccordionItemDescriptor,
	IAccordionItem,
	TAccordionItemCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: AccordionItemDescriptor,
	facade: AccordionCollectionItemDescriptor,
	template: accordionItemTemplate,
	root: { strategy: 'host', sets: ['attrs', 'dataset'], order: true, control: true },
	setup: setupAccordionItem,
})

export type TAccordionItemElementProps = TElementType<typeof TAccordionItemElement>
