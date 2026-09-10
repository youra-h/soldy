import { TSelectionCollectionFacade } from '../../../../base/collection'
import type { TCollectionFacadeOptions, TSelectionFacadeProps } from '../../../../base/collection'
import type { TAccordionView } from '../../types'
import { AccordionFactory, ACCORDION_EXTENSIONS, ACCORDION_OWNER_EXTENSIONS } from '../factory'
import { resolveEngine } from '../../../../base/collection/create/internal'
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
		// Движок мог прийти снаружи собранным на любом уровне — `resolveEngine`
		// дополнит его до того, что нужно Accordion. Именно здесь, а не в теле:
		// базы трогают расширения в своих конструкторах
		super({}, {
			engine: resolveEngine(
				options,
				ACCORDION_EXTENSIONS(),
				ACCORDION_OWNER_EXTENSIONS,
				'Accordion',
				AccordionFactory,
			) as TAccordionCollection,
		})

		this.events.relay(this.extensions.accordion.events, ['change:view'])

		this.applyProps(props)
	}

	get view(): TAccordionView {
		return this.extensions.accordion.view
	}
}
