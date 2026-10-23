import type { IAccordion } from '@soldy-ui/core'
import type { AccordionCollectionDescriptor, AccordionDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/** События Accordion — свои и фасада коллекции. */
export type AccordionEventProps = EventProps<typeof AccordionDescriptor> &
	EventProps<typeof AccordionCollectionDescriptor>

export type AccordionProps = UseDomProps<
	typeof AccordionDescriptor,
	IAccordion,
	AccordionEventProps
>
