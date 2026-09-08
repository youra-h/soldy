import {
	TFactoryExtension,
	TCollectionEngine,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
} from '../../../base/collection'
import { TAccordionExtension, TAccordionContentExtension } from './extensions'
import type { IAccordion } from '../types'
import type { IAccordionItem } from '../item/types'
import type { IAccordionItemProps } from '../item/types'

export type TAccordionCollectionExtensions = {
	factory: TFactoryExtension<IAccordionItem>
	unique: TUniqueExtension<IAccordionItem>
	meta: TMetaExtension<IAccordionItem>
	order: TOrderExtension<IAccordionItem>
	plain: TPlainExtension<IAccordionItem>
	batch: TBatchExtension<IAccordionItem>
	selection: TSelectionExtension<IAccordionItem>
	accordion: TAccordionExtension<IAccordion, IAccordionItem>
	content: TAccordionContentExtension<IAccordionItem>
}

export type TAccordionCollection = TCollectionEngine<IAccordionItem, TAccordionCollectionExtensions>

/**
 * Owner-level props коллекции Accordion.
 * Объединяет pass-through engine + batch (items, trackBy) + selection (mode).
 */
export interface IAccordionCollectionProps<TItemProps = IAccordionItemProps, TItem = IAccordionItem>
	extends
		ICollectionProps<TAccordionCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/**
 * Item-level props элемента Accordion.
 * Объединяет selection (selected) + потенциальные item-расширения.
 */
export interface IAccordionCollectionItemProps extends ISelectionCollectionItemProps {}
