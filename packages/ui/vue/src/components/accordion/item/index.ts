import type { TClosedComponent } from '../../../adapter'
import AccordionItemComponent from './Item.vue'

export * from './base.component'
export { default as BaseAccordionItem } from './base.component'

export const AccordionItem: TClosedComponent<typeof AccordionItemComponent> = AccordionItemComponent
