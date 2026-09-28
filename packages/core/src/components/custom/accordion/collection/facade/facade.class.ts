import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import type { TAccordionView } from '../../types'
import { ACCORDION_EXTENSIONS } from '../factory'
import { createEngineAccordion } from '../create'
import { completeEngine } from '../../../../base/collection/create/internal'
import type { TAccordionCollectionExtensions, TAccordionCollectionFacadeEngine } from '../types'
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
		options: TCollectionFacadeOptions<TAccordionCollectionFacadeEngine, IAccordion>,
	) {
		// Движок пришёл снаружи — дособрать до компонента; нет — собрать свой.
		// Здесь, а не в теле: базы трогают расширения в своих конструкторах
		super(
			{},
			{
				engine: options.engine
					? completeEngine(options.engine, ACCORDION_EXTENSIONS(), options.owner)
					: createEngineAccordion({ owner: options.owner }),
			},
		)

		this.events.relayAll(this.extensions.accordion.events)

		this.applyProps(props)
	}

	get view(): TAccordionView | undefined {
		return this.extensions.accordion.view
	}
}
