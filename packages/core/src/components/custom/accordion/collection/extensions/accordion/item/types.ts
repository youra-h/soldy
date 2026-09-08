import type { IItemExtension, TBaseItemEventsExtension } from '../../../../../../base/collection'
import type { TAccordionView } from '../../../../types'

export type TAccordionItemEventsExtension = TBaseItemEventsExtension & {
	'change:view': (value: TAccordionView) => void
}

/**
 * Контракт item-адаптера accordion.
 * Предоставляет геттер view — резолвится из родительского расширения (TAccordion).
 */
export interface IAccordionItemExtension<TItem extends object = any> extends IItemExtension<
	TItem,
	TAccordionItemEventsExtension
> {
	/** Внешний вид элемента (наследуется от TAccordion). */
	readonly view: TAccordionView
}
