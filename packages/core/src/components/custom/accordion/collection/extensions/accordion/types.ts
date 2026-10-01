import type { IAccordion } from '../../../types'
import type { TAccordionView } from '../../../types'
import type { IExtension, IExtensionItems } from '../../../../../base/collection'
import type { TAccordionExtension } from './accordion.extension'
import type { IAccordionItemExtension } from './item'
import type { IAccordionItem } from '../../../item/types'

/**
 * Контракт расширения accordion.
 * Используется как тип TParent в TAccordionItemExtension для типизированного доступа к _parent.
 */
export interface IAccordionExtension<TItem extends IAccordionItem = IAccordionItem>
	extends
		IExtension<TItem, TAccordionExtensionEvents>,
		IExtensionItems<TItem, IAccordionItemExtension<TItem>> {
	/** Внешний вид с инстанса TAccordion. */
	readonly view: TAccordionView | undefined
}

/** Опции движка Accordion: владелец приходит и уходит после сборки. */
export type TAccordionEngineOptions<TOwner extends IAccordion = IAccordion> = {
	owner: TOwner
}

/**
 * События расширения TAccordionExtension.
 */
export type TAccordionExtensionEvents = {
	'change:view': (value: TAccordionView | undefined) => void
}

export type TAccordionExtensions<TItem extends IAccordionItem> = {
	accordion: TAccordionExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
