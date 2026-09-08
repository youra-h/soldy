import { withParts } from '@soldy/setup'
import AccordionComponent from './Accordion.vue'
import { AccordionItem } from './item'

export { default as BaseAccordion, emitsAccordion, propsAccordion } from './base.component'
export * from './item'

/** Основная форма — `<Accordion.Item>`; плоский `AccordionItem` работает так же. */
export const Accordion = withParts(AccordionComponent, { Item: AccordionItem })
