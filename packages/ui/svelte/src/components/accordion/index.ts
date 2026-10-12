/**
 * Accordion — раскрывающиеся секции на базе TAccordion и коллекции Accordion.
 */

import { withParts } from '@soldy-ui/setup'
import AccordionComponent from './Accordion.svelte'
import { AccordionItem } from './item'

export * from './base.component'
export { setupAccordion } from './setup.component'
export * from './item'

/**
 * Основная форма — `<Accordion.Item>`; плоский `AccordionItem` работает так же.
 * Части у аккордеона одна: панель — слот секции, а не компонент.
 */
export const Accordion = withParts(AccordionComponent, { Item: AccordionItem })
