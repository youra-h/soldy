import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import type { TAccordionView } from '../../types'
import { accordionExtensions } from '../factory'
import { completeEngine } from '../../../../base/collection/create/internal'
import type {
	TAccordionCollection,
	TAccordionCollectionExtensions,
	TAccordionCollectionFacadeEngine,
} from '../types'
import type { TAccordionCollectionFacadeEvents } from '../types'
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
	TAccordionCollectionExtensions,
	TAccordionCollectionFacadeEvents
> {
	constructor(
		props: TSelectionFacadeProps<IAccordionItem> = {},
		options: TCollectionFacadeOptions<TAccordionCollectionFacadeEngine, IAccordion> = {},
	) {
		// Движок мог прийти снаружи собранным на любом уровне — `completeEngine`
		// доставит в него то, чего не хватает Accordion. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: completeEngine(
					options.engine,
					accordionExtensions(),
				) as TAccordionCollection,
				owner: options.owner,
			},
		)

		if (!options.engine) this.bindOwner()

		this.events.relayAll(this.extensions.accordion.events)

		this.applyProps(props)
	}

	get view(): TAccordionView | undefined {
		return this.extensions.accordion.view
	}
}
