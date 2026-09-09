import { TCollectionEngine } from '../../../base/collection'
import type {
	ICollectionProps,
	IBatchCollectionProps,
	ISelectionCollectionItemProps,
	ISelectionCollectionProps,
	TCollectionFacadeOptions,
	IExtension,
	ISelectionItemExtension,
	IOrderItemExtension,
	TFactoryExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
	TMetaExtension,
	TBatchExtension,
	TSelectionExtension,
	TValueSelectionExtension,
} from '../../../base/collection'
import type { IListBoxItemExtension } from './extensions/list-box/item/types'
import { TListBoxExtension } from './extensions'
import type { IListBox } from '../types'
import type { IListBoxItem, IListBoxItemProps } from '../item/types'

export type TListBoxCollectionExtensions = {
	factory: TFactoryExtension<IListBoxItem>
	unique: TUniqueExtension<IListBoxItem>
	meta: TMetaExtension<IListBoxItem>
	order: TOrderExtension<IListBoxItem>
	plain: TPlainExtension<IListBoxItem>
	batch: TBatchExtension<IListBoxItem>
	selection: TSelectionExtension<IListBoxItem>
	/** Связь `value` списка с выбором коллекции — в обе стороны. */
	value: TValueSelectionExtension<any, IListBoxItem>
	list: TListBoxExtension<IListBox, IListBoxItem>
}

export type TListBoxCollection = TCollectionEngine<IListBoxItem, TListBoxCollectionExtensions>

/** Owner-level props коллекции: состав + режим выбора. */
export interface IListBoxCollectionProps<
	TItemProps = IListBoxItemProps,
	TItem = IListBoxItem,
	TCollection = TListBoxCollection,
>
	extends ICollectionProps<TCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props элемента: выбранность. */
export interface IListBoxCollectionItemProps extends ISelectionCollectionItemProps {}

/** Опции конструктора фасада коллекции. */
export type TListBoxCollectionFacadeOptions<
	TItem extends IListBoxItem = IListBoxItem,
	TExtensions extends Record<string, IExtension<any>> = TListBoxCollectionExtensions,
> = TCollectionFacadeOptions<TCollectionEngine<TItem, TExtensions>, IListBox> & {
	/** Фабрика движка коллекции — переопределяется наследником. */
	factory?: (owner: IListBox) => TCollectionEngine<TItem, TExtensions>
}

/**
 * Item-адаптеры коллекции: выбор, порядок и делегат списка.
 *
 * Используется фасадом элемента для типизированного доступа к `adapters`.
 */
export type TListBoxAdapters<TItem extends IListBoxItem = IListBoxItem> = {
	selection: ISelectionItemExtension<TItem>
	order: IOrderItemExtension<TItem>
	list: IListBoxItemExtension<TItem>
}
