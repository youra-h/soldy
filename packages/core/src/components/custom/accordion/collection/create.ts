import { createComponentEngine } from '../../../base/collection/create/internal'
import type { TCreateEngineOptions } from '../../../base'
import { ACCORDION_EXTENSIONS, ACCORDION_OWNER_EXTENSIONS } from './factory'
import type { TAccordionCollection } from './types'
import type { IAccordion } from '../types'

/**
 * Коллекция Accordion целиком — со всем, включая владельческое.
 *
 * `owner` обязателен: проброс `size`/`variant`/`disabled` и вид секций держатся
 * на компоненте. Нужна коллекция без него — берите `createEngine` или
 * `createEngineSelection`: недостающее `<Accordion>` доустановит сам.
 */
export function createEngineAccordion(
	options: TCreateEngineOptions & { owner: IAccordion },
): TAccordionCollection {
	return createComponentEngine(
		'createEngineAccordion',
		ACCORDION_EXTENSIONS(),
		ACCORDION_OWNER_EXTENSIONS,
		options,
	) as TAccordionCollection
}
