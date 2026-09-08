import { TAccordionCollection } from './types'
import { TAccordionExtension, TAccordionContentExtension } from './extensions'
import {
	TCollectionEngine,
	TPlainExtension,
	TBatchExtension,
	TFactoryExtension,
	TSelectionExtension,
	TOrderExtension,
	TUniqueExtension,
	TMetaExtension,
} from './../../../base'
import TAccordionItem from './../item/item.class'
import type { IAccordionItem } from './../item/types'
import type { IAccordion } from './../types'

export const AccordionFactory = (instance: IAccordion): TAccordionCollection =>
	new TCollectionEngine({
		extensions: {
			factory: new TFactoryExtension<IAccordionItem>({ itemCtor: TAccordionItem }),
			unique: new TUniqueExtension<IAccordionItem>(),
			meta: new TMetaExtension<IAccordionItem>(),
			order: new TOrderExtension<IAccordionItem>(),
			plain: new TPlainExtension<IAccordionItem>(),
			batch: new TBatchExtension<IAccordionItem>(),
			selection: new TSelectionExtension<IAccordionItem>(),
			accordion: new TAccordionExtension({ owner: instance }),
			content: new TAccordionContentExtension<IAccordionItem>(),
		},
	})
