import { defineComponent } from '../../../define'
import { TAccordionCollectionFacade, TAccordionItemCollectionFacade } from '@soldy/core'
import {
	AccordionCollectionContribution,
	AccordionCollectionItemContribution,
} from '../../../contributions'
import { CollectionDescriptor } from '../collection'

export const AccordionCollectionDescriptor = () =>
	defineComponent({
		ctor: TAccordionCollectionFacade,

		extends: CollectionDescriptor(),

		contribution: AccordionCollectionContribution(),
	})

export const AccordionCollectionItemDescriptor = () =>
	defineComponent({
		ctor: TAccordionItemCollectionFacade,
		contribution: AccordionCollectionItemContribution(),
	})
