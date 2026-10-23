import type { HTMLAttributes } from 'react'
import type { IAccordionItem } from '@soldy-ui/core'
import type { AccordionCollectionItemDescriptor, AccordionItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, UseDomProps } from '../../../types'

/** События секции — свои и фасада. */
export type AccordionItemEventProps = EventProps<typeof AccordionItemDescriptor> &
	EventProps<typeof AccordionCollectionItemDescriptor>

/** Атрибуты секции: класс и стиль — корню, остальное — заголовку. */
export type AccordionItemAttributes = TDomAttributes<
	typeof AccordionItemDescriptor,
	HTMLAttributes<HTMLElement>,
	AccordionItemEventProps
>

export type AccordionItemProps = UseDomProps<
	typeof AccordionItemDescriptor,
	IAccordionItem,
	AccordionItemEventProps
>
