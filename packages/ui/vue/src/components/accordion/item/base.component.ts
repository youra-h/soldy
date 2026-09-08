import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps, UseProps } from '../../../types/common'
import { AccordionItemDescriptor, AccordionCollectionItemDescriptor } from '@soldy/setup'
import type { IAccordionItem } from '@soldy/core'

export const emitsAccordionItem: TEmits = [
	...useEmits(AccordionItemDescriptor()),
	...useEmits(AccordionCollectionItemDescriptor()),
] as unknown as TEmits

export const propsAccordionItem: TProps = {
	...(useProps(AccordionItemDescriptor()) as TProps),
	...(useProps(AccordionCollectionItemDescriptor()) as TProps),
}

export type AccordionItemProps = UseProps<typeof AccordionItemDescriptor, IAccordionItem>

export default {
	name: 'BaseAccordionItem',
	emits: emitsAccordionItem,
	props: propsAccordionItem,
}
