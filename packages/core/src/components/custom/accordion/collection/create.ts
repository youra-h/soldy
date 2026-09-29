import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { accordionExtensions } from './factory'
import type { TAccordionCollection } from './types'
import type { IAccordion } from '../types'
import type { IAccordionItem } from '../item/types'

/**
 * Коллекция Accordion целиком. `owner` необязателен: без него детали владельца не
 * ставятся — их доставит `<Accordion>`, когда движок передадут компоненту.
 */
export function createEngineAccordion(
	options: TCreateEngineOptions<IAccordionItem> & { owner?: IAccordion } = {},
): TAccordionCollection {
	return createComponentEngine(accordionExtensions, options)
}
