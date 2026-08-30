import type { IList } from '../../types'
import type {
	IBaseOwnerItemExtensionOptions,
	IExtension,
	IExtensionItems,
} from '../../../../base/collection'
import type { TListExtension } from './list.extension'
import type { IListItemExtension } from './item'
import type { IListItem } from '../../list-item/types'

/**
 * Контракт расширения list.
 * Используется как тип TParent в TListItemExtension для типизированного доступа к _parent.
 */
export interface IListExtension<
	TItem extends IListItem = IListItem,
	TItemExt extends IListItemExtension<TItem> = IListItemExtension<TItem>,
>
	extends IExtension<TItem>, IExtensionItems<TItem, TItemExt> {
	/** Глобальный wordWrap с инстанса TList. */
	readonly wordWrap: boolean
}

/**
 * Опции конструктора TListExtension.
 * Расширяет IBaseOwnerItemExtensionOptions ссылкой на инстанс TList.
 */
export interface IListExtensionOptions<
	TOwner extends IList<any, any, any> = IList<any, any, any>,
	TItem extends IListItem = IListItem,
	TItemExt extends IListItemExtension<TItem> = IListItemExtension<TItem>,
> extends IBaseOwnerItemExtensionOptions<TItem, TItemExt> {
	/** Ссылка на инстанс компонента TList. */
	owner: TOwner
}

/**
 * События расширения TListExtension.
 */
export type TListExtensionEvents = {
	'change:wordWrap': (value: boolean) => void
}

export type TListExtensions<TItem extends IListItem> = {
	list: TListExtension<any, TItem>
	[key: string]: IExtension<TItem>
}
