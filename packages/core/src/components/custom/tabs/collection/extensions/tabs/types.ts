import type { ITabs } from '../../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../../base/collection'
import type { TTabsExtension } from './tabs.extension'
import type { ITabsItemExtension } from './item'
import type { ITabsItem } from '../../../item/types'

/**
 * Контракт расширения табов.
 * Используется как тип TParent в TTabsItemExtension для типизированного доступа к _parent.
 */
export interface ITabsExtension<TItem extends ITabsItem = ITabsItem>
	extends
		IExtension<TItem, TTabsExtensionEvents>,
		IExtensionItems<TItem, ITabsItemExtension<TItem>> {
	/** Глобальный closable с инстанса TTabs. */
	readonly closable: boolean

	/**
	 * Таб, который держит остановку Tab (`tabindex="0"`): активный, если на
	 * него можно перейти, иначе первый такой по порядку.
	 */
	readonly tabStop: TItem | undefined

	/** Проверить, есть ли в коллекции активные табы. */
	hasEnabledTabs(): boolean
	/**
	 * Можно ли перейти на таб: не disabled, visible и rendered. Одно правило
	 * для остановки Tab и навигации с клавиатуры.
	 */
	isEnabledTab(item: TItem): boolean
	/** Закрыть таб (удалить элемент из коллекции). */
	closeTab(item: TItem): boolean
}

/**
 * Опции конструктора TTabsExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TTabs.
 */
export interface ITabsExtensionOptions<
	TOwner extends ITabs = ITabs,
	TItem extends ITabsItem = ITabsItem,
> extends IBaseOwnerItemExtensionOptions<TItem, ITabsItemExtension<TItem>> {
	/** Ссылка на инстанс компонента TTabs. */
	owner: TOwner
}

/**
 * События расширения TTabsExtension.
 */
export type TTabsExtensionEvents = {
	'item:close': (item: ITabsItem) => void
	'change:closable': (value: boolean) => void
}

export type TTabsExtensions<TItem extends ITabsItem> = {
	tabs: TTabsExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
