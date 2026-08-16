import type { ITabs } from '../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../base/collection'
import type { TTabsExtension } from './tabs.extension'
import type { ITabItemExtension } from './item'
import type { ITabItem } from '../../tab-item/types'

/**
 * Контракт расширения табов.
 * Используется как тип TParent в TTabItemExtension для типизированного доступа к _parent.
 */
export interface ITabsExtension<TItem extends ITabItem = ITabItem>
	extends IExtension<TItem>, IExtensionItems<TItem, ITabItemExtension<TItem>> {
	/** Глобальный closable с инстанса TTabs. */
	readonly closable: boolean

	/** Проверить, есть ли в коллекции активные табы. */
	hasEnabledTabs(): boolean
	/** Закрыть таб (удалить элемент из коллекции). */
	closeTab(item: TItem): boolean
}

/**
 * Опции конструктора TTabsExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TTabs.
 */
export interface ITabsExtensionOptions<
	TOwner extends ITabs = ITabs,
	TItem extends ITabItem = ITabItem,
> extends IBaseOwnerItemExtensionOptions<TItem, ITabItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TTabs. */
	owner: TOwner
}

/**
 * События расширения TTabsExtension.
 */
export type TTabsExtensionEvents = {
	'item:close': (item: ITabItem) => void
}

export type TTabsExtensions<TItem extends ITabItem> = {
	tabs: TTabsExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
