import { withParts } from '@soldy-ui/setup'
import AccordionComponent from './Accordion.svelte'
import { AccordionItem } from './item'

export * from './base.component'
export { setupAccordion } from './setup.component'
export * from './item'

export const Accordion = withParts(AccordionComponent, { Item: AccordionItem })
