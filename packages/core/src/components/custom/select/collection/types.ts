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
	ISelectionItemExtension,
	IOrderItemExtension,
} from '../../../base/collection'
import { TSelectExtension } from './extensions'
import type { ISelectItemExtension } from './extensions/select/item/types'
import type { ISelect } from '../types'
import type { ISelectItem, ISelectItemProps } from '../item/types'

export type TSelectCollectionExtensions = {
	factory: TFactoryExtension<ISelectItem>
	unique: TUniqueExtension<ISelectItem>
	meta: TMetaExtension<ISelectItem>
	order: TOrderExtension<ISelectItem>
	plain: TPlainExtension<ISelectItem>
	batch: TBatchExtension<ISelectItem>
	selection: TSelectionExtension<ISelectItem>
	select: TSelectExtension<ISelect, ISelectItem>
}

export type TSelectCollection = TCollectionEngine<ISelectItem, TSelectCollectionExtensions>

/**
 * Owner-level props коллекции Select.
 *
 * `mode` приходит из selection и служит переключателем множественного выбора:
 * отдельного пропа `multiple` нет намеренно — два имени для одного состояния
 * однажды разошлись бы.
 */
export interface ISelectCollectionProps<TItemProps = ISelectItemProps, TItem = ISelectItem>
	extends ICollectionProps<TSelectCollection>,
		IBatchCollectionProps<TItemProps, TItem>,
		ISelectionCollectionProps {}

/** Item-level props опции. */
export interface ISelectCollectionItemProps extends ISelectionCollectionItemProps {}

export type TSelectCollectionFacadeOptions = TCollectionFacadeOptions<
	TSelectCollection,
	ISelect<any, any, any>
>

/** Item-адаптеры коллекции Select — типизированный доступ к `context.adapters`. */
export type TSelectAdapters = {
	selection: ISelectionItemExtension<ISelectItem>
	order: IOrderItemExtension<ISelectItem>
	select: ISelectItemExtension<ISelectItem>
}
