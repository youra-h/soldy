import type {
	ICollectionProps,
	TActivationCollectionFacadeEvents,
	TActivationExtension,
	TBatchExtension,
	TCollectionEngine,
	TFactoryExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
} from '../../../base/collection'
import type { IPaginationItem } from '../item/types'
import type {
	TPaginationEngineOptions,
	TPaginationExtension,
	TPaginationExtensionEvents,
} from './extensions'

export type TPaginationCollectionExtensions = {
	factory: TFactoryExtension<IPaginationItem>
	unique: TUniqueExtension<IPaginationItem>
	meta: TMetaExtension<IPaginationItem>
	order: TOrderExtension<IPaginationItem>
	plain: TPlainExtension<IPaginationItem>
	batch: TBatchExtension<IPaginationItem>
	activation: TActivationExtension<IPaginationItem>
	/** Страницы окна, связь `value` с текущей страницей и окно с пропусками */
	pagination: TPaginationExtension
}

export type TPaginationCollection = TCollectionEngine<
	IPaginationItem,
	TPaginationCollectionExtensions,
	TPaginationEngineOptions
>

/**
 * Движок, который принимает фасад: любого уровня сборки, недостающее фасад
 * дополнит сам (`completeEngine`). Оба параметра — `any`: движок инвариантен
 * по набору расширений через `engine:create` (см. `TTabsCollectionFacadeEngine`).
 */
export type TPaginationCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции пагинации — движок снаружи.
 *
 * Состава (`items`) и ключа сверки (`trackBy`) среди пропсов нет, как у
 * календаря: страницы окна кладёт в коллекцию сама пагинация, и ключ —
 * ключ страницы.
 */
export interface IPaginationCollectionProps extends ICollectionProps<TPaginationCollectionFacadeEngine> {}

/** События фасада коллекции: набор базы активации плюс окно. */
export type TPaginationCollectionFacadeEvents = TActivationCollectionFacadeEvents<IPaginationItem> &
	TPaginationExtensionEvents
