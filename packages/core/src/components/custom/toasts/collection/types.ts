import type {
	ICollectionProps,
	IBatchCollectionProps,
	TBatchCollectionFacadeEvents,
	TBatchExtension,
	TCollectionEngine,
	TFactoryExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
} from '../../../base/collection'
import type { TToastsExtension, TToastsEngineOptions, TToastsExtensionEvents } from './extensions'
import type { IToasts } from '../types'
import type { IToastsItem, IToastsItemProps } from '../item/types'

export type TToastsCollectionExtensions = {
	factory: TFactoryExtension<IToastsItem>
	unique: TUniqueExtension<IToastsItem>
	meta: TMetaExtension<IToastsItem>
	order: TOrderExtension<IToastsItem>
	plain: TPlainExtension<IToastsItem>
	batch: TBatchExtension<IToastsItem>
	/** Очередь: вставка, предел видимых, длительность и сторона жеста */
	toasts: TToastsExtension<IToasts>
}

export type TToastsCollection = TCollectionEngine<
	IToastsItem,
	TToastsCollectionExtensions,
	TToastsEngineOptions
>

/**
 * Движок, который принимает фасад: любого уровня сборки, недостающее фасад
 * дополнит сам (`completeEngine`). Оба параметра — `any`: движок инвариантен по
 * набору расширений через `engine:create` (см. `TTagsCollectionFacadeEngine`).
 */
export type TToastsCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции: движок снаружи и состав.
 *
 * Тосты приходят из кода (`show`), но состав — обычный вход коллекции, как у
 * остальных: `items` и движок снаружи (`engine`) работают так же.
 */
export interface IToastsCollectionProps<
	TItemProps = IToastsItemProps,
	TItem = IToastsItem,
	TCollection = TToastsCollectionFacadeEngine,
>
	extends ICollectionProps<TCollection>, IBatchCollectionProps<TItemProps, TItem> {}

/** События фасада коллекции: набор базы с `batch` плюс карта расширения `toasts`. */
export type TToastsCollectionFacadeEvents = TBatchCollectionFacadeEvents<IToastsItem> &
	TToastsExtensionEvents
