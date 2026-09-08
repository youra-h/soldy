import type { IAccordion } from '../../../types'
import type { TAccordionView } from '../../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { TAccordionExtension } from './accordion.extension'
import type { IAccordionItemExtension } from './item'
import type { IAccordionItem } from '../../../item/types'

/**
 * Контракт расширения accordion.
 * Используется как тип TParent в TAccordionItemExtension для типизированного доступа к _parent.
 */
export interface IAccordionExtension<TItem extends IAccordionItem = IAccordionItem>
	extends IExtension<TItem>, IExtensionItems<TItem, IAccordionItemExtension<TItem>> {
	/** Внешний вид с инстанса TAccordion. */
	readonly view: TAccordionView
}

/**
 * Опции конструктора TAccordionExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TAccordion.
 */
export interface IAccordionExtensionOptions<
	TOwner extends IAccordion = IAccordion,
	TItem extends IAccordionItem = IAccordionItem,
> extends IBaseOwnerItemExtensionOptions<TItem, IAccordionItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TAccordion. */
	owner: TOwner
}

/**
 * События расширения TAccordionExtension.
 */
export type TAccordionExtensionEvents = {
	'change:view': (value: TAccordionView) => void
}

export type TAccordionExtensions<TItem extends IAccordionItem> = {
	accordion: TAccordionExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
