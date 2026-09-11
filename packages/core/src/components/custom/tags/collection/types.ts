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
import type { ITagsItemExtension } from './extensions/tags/item/types'
import { TTagsExtension } from './extensions'
import type { ITags } from '../types'
import type { ITagsItem, ITagsItemProps } from '../item/types'

export type TTagsCollectionExtensions = {
	factory: TFactoryExtension<ITagsItem>
	unique: TUniqueExtension<ITagsItem>
	meta: TMetaExtension<ITagsItem>
	order: TOrderExtension<ITagsItem>
	plain: TPlainExtension<ITagsItem>
	batch: TBatchExtension<ITagsItem>
	selection: TSelectionExtension<ITagsItem>
	/** Связь `value` набора с выбором коллекции — в обе стороны. */
	value: TValueSelectionExtension<any, ITagsItem>
	tags: TTagsExtension<ITags, ITagsItem>
}

export type TTagsCollection = TCollectionEngine<ITagsItem, TTagsCollectionExtensions>

/** Owner-level props коллекции: состав + режим выбора (по умолчанию `none`). */
export interface ITagsCollectionProps<
	TItemProps = ITagsItemProps,
	TItem = ITagsItem,
	TCollection = TTagsCollection,
>
	extends ICollectionProps<TCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props элемента: выбранность. */
export interface ITagsCollectionItemProps extends ISelectionCollectionItemProps {}

/** Опции конструктора фасада коллекции. */
export type TTagsCollectionFacadeOptions<
	TItem extends ITagsItem = ITagsItem,
	TExtensions extends Record<string, IExtension<any>> = TTagsCollectionExtensions,
> = TCollectionFacadeOptions<TCollectionEngine<TItem, TExtensions>, ITags> & {
	/** Фабрика движка коллекции — переопределяется наследником. */
	factory?: (owner: ITags) => TCollectionEngine<TItem, TExtensions>
}

/**
 * Item-адаптеры коллекции: выбор, порядок и делегат тегов.
 *
 * Используется фасадом элемента для типизированного доступа к `adapters`.
 */
export type TTagsAdapters<TItem extends ITagsItem = ITagsItem> = {
	selection: ISelectionItemExtension<TItem>
	order: IOrderItemExtension<TItem>
	tags: ITagsItemExtension<TItem>
}
