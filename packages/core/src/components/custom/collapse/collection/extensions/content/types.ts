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
 * Собственного состояния нет: вся работа — в item-адаптере, который знает
 * элемент и потому может посчитать связку. Расширение нужно, чтобы этот
 * адаптер появился в контексте элемента.
 */
export interface ICollapseContentExtension<TItem extends ICollapseItem = ICollapseItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ICollapseContentItemExtension<TItem>> {}

export type ICollapseContentExtensionOptions<TItem extends ICollapseItem = ICollapseItem> =
	IBaseOwnerItemExtensionOptions<TItem, ICollapseContentItemExtension<TItem>>

export type TCollapseContentExtensionEvents = Record<string, never>
