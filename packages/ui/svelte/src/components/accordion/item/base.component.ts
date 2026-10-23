import type { IAccordionItem } from '@soldy-ui/core'
import type { AccordionCollectionItemDescriptor, AccordionItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

export type AccordionItemEventProps = EventProps<typeof AccordionItemDescriptor> &
	EventProps<typeof AccordionCollectionItemDescriptor>

/** Атрибуты секции: класс и стиль — корню, остальное — заголовку. */
export type AccordionItemAttributes = TDomAttributes<
	typeof AccordionItemDescriptor,
	AccordionItemEventProps
>

export type AccordionItemProps = UseDomProps<
	typeof AccordionItemDescriptor,
	IAccordionItem,
	AccordionItemEventProps
>
