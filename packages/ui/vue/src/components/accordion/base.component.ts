import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { AccordionDescriptor, AccordionCollectionDescriptor } from '@soldy/setup'
import type { IAccordion } from '@soldy/core'

export const emitsAccordion: TEmits = [
	...useEmits(AccordionDescriptor()),
	...useEmits(AccordionCollectionDescriptor()),
] as unknown as TEmits

export const propsAccordion: TProps = {
	...(useProps(AccordionDescriptor()) as TProps),
	...(useProps(AccordionCollectionDescriptor()) as TProps),
}

export type AccordionProps = UseProps<typeof AccordionDescriptor, IAccordion>

export default {
	name: 'BaseAccordion',
	emits: emitsAccordion,
	props: propsAccordion,
}
