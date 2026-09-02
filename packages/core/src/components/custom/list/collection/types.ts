import {
	TFactoryExtension,
	TCollectionEngine,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
} from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TCollectionFacadeOptions,
	IExtension,
	ISelectionItemExtension,
	IOrderItemExtension,
} from '../../../base/collection'
import { TListExtension } from './extensions'
import type { IListItemExtension } from './extensions/item/types'
import type { IList } from '../types'
import type { IListItem } from '../list-item/types'
import type { IListItemProps } from '../list-item/types'

/**
 * Базовый набор расширений коллекции List (общий для List и ListBox).
 * Параметризован типом элемента.
 */
export type TListBaseCollectionExtensions<TItem extends IListItem> = {
	factory: TFactoryExtension<TItem>
	unique: TUniqueExtension<TItem>
	meta: TMetaExtension<TItem>
	order: TOrderExtension<TItem>
	plain: TPlainExtension<TItem>
	batch: TBatchExtension<TItem>
	selection: TSelectionExtension<TItem>
}

export type TListCollectionExtensions = TListBaseCollectionExtensions<IListItem> & {
	list: TListExtension<IList, IListItem>
}

export type TListCollection = TCollectionEngine<IListItem, TListCollectionExtensions>

/**
 * Owner-level props коллекции List.
 * Объединяет pass-through engine + batch (items, trackBy) + selection (mode).
 */
export interface IListCollectionProps<
	TItemProps = IListItemProps,
	TItem = IListItem,
	TCollection = TListCollection,
> extends ICollectionProps<TCollection>, IBatchCollectionProps<TItemProps, TItem>, ISelectionCollectionProps {}

/**
 * Item-level props элемента List.
 * Объединяет selection (selected) + потенциальные item-расширения.
 */
export interface IListCollectionItemProps extends ISelectionCollectionItemProps {}

/**
 * Опции конструктора фасада коллекции List.
 * Добавляет опциональную фабрику движка (переопределяется в ListBox).
 */
export type TListCollectionFacadeOptions<
	TItem extends IListItem = IListItem,
	TExtensions extends Record<string, IExtension<any>> = TListCollectionExtensions,
> = TCollectionFacadeOptions<TCollectionEngine<TItem, TExtensions>, IList<any, any, any>> & {
	/** Фабрика движка коллекции (переопределяется в ListBox). */
	factory?: (owner: IList<any, any, any>) => TCollectionEngine<TItem, TExtensions>
}

/**
 * Item-адаптеры коллекции List (selection, order, list).
 * Используется фасадами для типизированного доступа к adapters.
 */
export type TListAdapters<TItem extends IListItem> = {
	selection: ISelectionItemExtension<TItem>
	order: IOrderItemExtension<TItem>
	list: IListItemExtension<TItem>
}
