import { withParts } from '@soldy-ui/setup'
import type { TClosedComponent } from '../../adapter'
import AccordionComponent from './Accordion.vue'
import { AccordionItem } from './item'

export { default as BaseAccordion, emitsAccordion, propsAccordion } from './base.component'
export * from './item'

/** Экземпляр владельца закрыт так же, как у частей (`TClosedComponent`). */
const AccordionOwner: TClosedComponent<typeof AccordionComponent> = AccordionComponent

/** Основная форма — `<Accordion.Item>`; плоский `AccordionItem` работает так же. */
export const Accordion = withParts(AccordionOwner, { Item: AccordionItem })
