import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { ICollapseItem } from '../../../item/types'
import type { ICollapseContentItemExtension } from './item'

/**
 * Контракт расширения панелей Collapse.
 *
 * Держит формулу идентификаторов связки и проставляет сторону заголовка в
 * `aria` элемента. Item-адаптер нужен, чтобы отдать сторону панели: своего
 * компонента, а значит и своего набора, у неё нет.
 */
export interface ICollapseContentExtension<TItem extends ICollapseItem = ICollapseItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ICollapseContentItemExtension<TItem>> {
	/** `id` элемента-заголовка. */
	headerId(item: TItem): string
	/** `id` раскрывающейся панели. */
	contentId(item: TItem): string
}

export type ICollapseContentExtensionOptions<TItem extends ICollapseItem = ICollapseItem> =
	IBaseOwnerItemExtensionOptions<TItem, ICollapseContentItemExtension<TItem>>

export type TCollapseContentExtensionEvents = Record<string, never>
