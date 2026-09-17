import { defineComponent, defineDescriptor } from '../../../define'
import { TAccordionCollectionFacade, TAccordionItemCollectionFacade } from '@soldy/core'
import {
	AccordionCollectionContribution,
	AccordionCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const AccordionCollectionDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: AccordionCollectionContribution(),
	}),
)

export const AccordionCollectionItemDescriptor = defineDescriptor(() =>
	defineComponent({
		ctor: TAccordionItemCollectionFacade,
		contribution: AccordionCollectionItemContribution(),
	}),
)
