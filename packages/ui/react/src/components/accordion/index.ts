import { withParts } from '@soldy-ui/setup'
import { Accordion as AccordionComponent } from './Accordion'
import { AccordionItem } from './item'

export * from './base.component'
export * from './item'

export const Accordion = withParts(AccordionComponent, { Item: AccordionItem })
