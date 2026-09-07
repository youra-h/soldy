import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { ITabsItem } from '../../../item/types'
import type { ITabsContentItemExtension } from './item'

/**
 * Контракт расширения панелей.
 *
 * Собственного состояния у него нет: вся работа — в item-адаптере, который
 * знает таб и потому может посчитать связку. Расширение нужно, чтобы этот
 * адаптер вообще появился в контексте элемента.
 */
export interface ITabsContentExtension<TItem extends ITabsItem = ITabsItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ITabsContentItemExtension<TItem>> {}

export type ITabsContentExtensionOptions<TItem extends ITabsItem = ITabsItem> =
	IBaseOwnerItemExtensionOptions<TItem, ITabsContentItemExtension<TItem>>

export type TTabsContentExtensionEvents = Record<string, never>
