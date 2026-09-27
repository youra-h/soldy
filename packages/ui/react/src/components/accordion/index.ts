/**
 * Accordion — раскрывающиеся секции на базе TAccordion и коллекции Accordion.
 */

import { withParts } from '@soldy-ui/setup'
import { Accordion as AccordionComponent } from './Accordion'
import { AccordionItem } from './item'

// 1. Base (типы и пропсы)
export * from './base.component'

// 2. Setup (логика и хуки)
export { useSetupAccordion } from './setup.component'

// 3. Части
export * from './item'

/**
 * Основная форма — `<Accordion.Item>`; плоский `AccordionItem` работает так же.
 * Части у аккордеона одна: панель — слот секции, а не компонент.
 */
export const Accordion = withParts(AccordionComponent, { Item: AccordionItem })
