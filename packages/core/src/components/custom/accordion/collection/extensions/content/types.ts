import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { IAccordionItem } from '../../../item/types'
import type { IAccordionContentItemExtension } from './item'

/**
 * Контракт расширения панелей Accordion.
 *
 * Держит формулу идентификаторов связки и проставляет сторону заголовка в
 * `aria` элемента. Item-адаптер нужен, чтобы отдать сторону панели: своего
 * компонента, а значит и своего набора, у неё нет.
 */
export interface IAccordionContentExtension<TItem extends IAccordionItem = IAccordionItem>
	extends IExtension<TItem>, IExtensionItems<TItem, IAccordionContentItemExtension<TItem>> {
	/** `id` элемента-заголовка. */
	headerId(item: TItem): string
	/** `id` раскрывающейся панели. */
	contentId(item: TItem): string
}

export type IAccordionContentExtensionOptions<TItem extends IAccordionItem = IAccordionItem> =
	IBaseOwnerItemExtensionOptions<TItem, IAccordionContentItemExtension<TItem>>

export type TAccordionContentExtensionEvents = Record<string, never>
