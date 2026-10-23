/**
 * `<div is="so-accordion">` — набор раскрывающихся секций; модуль регистрирует
 * и секцию. docs/architecture.md, Layer 8d, «Коллекция».
 */

import { AccordionCollectionDescriptor, AccordionDescriptor } from '@soldy-ui/setup'
import type { IAccordion, TAccordionCollectionFacade } from '@soldy-ui/core'
import { ElementBase, defineElement } from '../../adapter'
import type { TElementClassOf, TElementType } from '../../adapter'
import { accordionTemplate } from './accordion.template'
import { TAccordionItemElement } from './item'
import { setupAccordion } from './setup.component'

export const TAccordionElement: TElementClassOf<
	typeof HTMLDivElement,
	typeof AccordionDescriptor,
	IAccordion,
	TAccordionCollectionFacade
> = ElementBase(HTMLDivElement, {
	descriptor: AccordionDescriptor,
	facade: AccordionCollectionDescriptor,
	template: accordionTemplate,
	root: { strategy: 'host', sets: ['attrs'] },
	setup: setupAccordion,
})

defineElement('so-accordion', TAccordionElement, 'div')
defineElement('so-accordion-item', TAccordionItemElement, 'div')

export type TAccordionElementProps = TElementType<typeof TAccordionElement>
