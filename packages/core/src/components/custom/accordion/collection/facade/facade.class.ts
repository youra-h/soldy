import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import type { TAccordionView } from '../../types'
import { AccordionFactory } from '../factory'
import type { TAccordionCollection, TAccordionCollectionExtensions } from '../types'
import type { IAccordionItem } from '../../item/types'
import type { IAccordion } from '../../types'

/**
 * Фасад коллекции accordion.
 *
 * Состав и выбор приходят из базы; своё — только `view`. Используется как
 * `ctor` в `AccordionCollectionDescriptor`.
 */
export class TAccordionCollectionFacade extends TSelectionCollectionFacade<
	IAccordionItem,
	TAccordionCollectionExtensions
> {
	constructor(
		props: TSelectionFacadeProps<IAccordionItem> = {},
		options: TCollectionFacadeOptions<TAccordionCollection, IAccordion> = {},
	) {
		super({}, { engine: options.engine ?? AccordionFactory(options.owner!) })

		this.events.relay(this.extensions.accordion.events, ['change:view'])

		this.applyProps(props)
	}

	get view(): TAccordionView {
		return this.extensions.accordion.view
	}
}
