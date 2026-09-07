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
 * Держит формулу идентификаторов связки и проставляет сторону таба каждому
 * элементу. Item-адаптер нужен, чтобы отдать встречную половину — сторону
 * панели — тому, кто нашёл таб по значению.
 */
export interface ITabsContentExtension<TItem extends ITabsItem = ITabsItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ITabsContentItemExtension<TItem>> {
	/** `id` элемента с `role="tab"`. */
	tabId(item: TItem): string
	/** `id` элемента с `role="tabpanel"`. */
	panelId(item: TItem): string
}

export type ITabsContentExtensionOptions<TItem extends ITabsItem = ITabsItem> =
	IBaseOwnerItemExtensionOptions<TItem, ITabsContentItemExtension<TItem>>

export type TTabsContentExtensionEvents = Record<string, never>
