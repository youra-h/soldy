import { TAccordionCollection } from './types'
import { TAccordionExtension, TAccordionContentExtension } from './extensions'
import { selectionExtensions, assembleEngine } from './../../../base/collection/create/internal'
import type { TExtensionSet, TOwnerExtensionSet } from './../../../base/collection/create/internal'
import TAccordionItem from './../item/item.class'
import type { IAccordionItem } from './../item/types'
import type { IAccordion } from './../types'

/**
 * Состав коллекции Accordion — объявлением, а не функцией сборки.
 *
 * Разделён надвое, потому что владелец есть не всегда: коллекцию можно собрать
 * снаружи (`createEngine`) и передать компоненту, а инстанс `TAccordion`
 * появится только там.
 */
export const ACCORDION_EXTENSIONS = (): TExtensionSet<IAccordionItem> => ({
	...selectionExtensions<IAccordionItem>(
		TAccordionItem as unknown as new (source: any) => IAccordionItem,
	),
	content: () => new TAccordionContentExtension<IAccordionItem>(),
})

/** То, чему нужен инстанс компонента. */
export const ACCORDION_OWNER_EXTENSIONS: TOwnerExtensionSet<IAccordionItem, IAccordion> = {
	accordion: (owner) => new TAccordionExtension({ owner }) as never,
}

/**
 * Полная коллекция Accordion. Внутренняя: наружу ведёт `createEngineAccordion`,
 * который требует владельца явно.
 */
export const AccordionFactory = (owner: IAccordion): TAccordionCollection => {
	const engine = assembleEngine<IAccordionItem, any>(ACCORDION_EXTENSIONS())

	for (const build of Object.values(ACCORDION_OWNER_EXTENSIONS)) engine.use(build(owner))

	return engine as TAccordionCollection
}
