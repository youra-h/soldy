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

/**
 * Событий у расширения нет.
 *
 * Пустой объект, а не `Record<string, never>`: у второго есть индексная
 * сигнатура, и «событий нет» читается проверкой `relay` как «любое имя
 * подойдёт». Пустая карта не пропускает ни одного.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type TTabsContentExtensionEvents = {}
