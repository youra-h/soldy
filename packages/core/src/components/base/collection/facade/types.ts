import type { IComponentOptions } from '../../component'
import type {
	TCollectionEngine,
	IExtension,
	TCollectionEngineItemSource,
	TCollectionEngineEvents,
	TPlainEvents,
	TBatchEvents,
	TSelectionEvents,
	TOrderItemEventsExtension,
	TSelectionItemEventsExtension,
} from '../engine'

/**
 * События фасада владельца коллекции — всё, что он отдаёт наружу.
 *
 * Карта не перечисляет имена. Фасад не эмитит ничего сам: он `relayAll`-ом
 * отдаёт наружу карты своих источников, и состав проброса — это и есть их
 * карты. Ссылка вместо перечисления держит одно знание в одном месте: новое
 * событие драйвера или движка доезжает до фасада само, и переименование ломает
 * компиляцию, а не оставляет мёртвое имя.
 *
 * `TComponentEvents` в карту не входит: это `Record<string, …>`, и любая
 * карта, пересёкшая его, снова принимает любое имя с любым обработчиком. Он
 * остаётся только констрейнтом дженерика — открыт в констрейнте, точен в
 * инстанцировании.
 *
 * Набор расширений в аргументе движка — `any`: иначе карта тянула бы за собой
 * `TExtensions`, а движок инвариантен по нему через `engine:create`.
 */
export type TCollectionComponentEvents<TItem extends object> = TPlainEvents<TItem> &
	TCollectionEngineEvents<TCollectionEngine<TItem, any>>

/** События фасада коллекции с расширением `batch`: набор базы плюс карта `batch`. */
export type TBatchCollectionFacadeEvents<TItem extends object> = TCollectionComponentEvents<TItem> &
	TBatchEvents<TItem>

/** События фасада коллекции с расширением `selection`: набор `batch` плюс карта `selection`. */
export type TSelectionCollectionFacadeEvents<TItem extends object> =
	TBatchCollectionFacadeEvents<TItem> & TSelectionEvents<TItem>

/** События фасада элемента с расширением `order` — карта его адаптера. */
export type TOrderItemFacadeEvents = TOrderItemEventsExtension

/** События фасада элемента, который можно выбрать: порядок плюс выбор. */
export type TSelectionItemFacadeEvents = TOrderItemFacadeEvents & TSelectionItemEventsExtension

/**
 * Опции конструктора фасада владельца коллекции.
 *
 * Расширяет `IComponentOptions` (states) и добавляет управляющий объект `engine`
 * — готовую коллекцию (аналог `ctrl` для обычных компонентов).
 */
export interface ICollectionComponentOptions<
	TItem extends object,
	TExtensions extends Record<string, IExtension<TItem>>,
> extends IComponentOptions {
	/** Управляющий объект — готовая коллекция (аналог `ctrl` для обычных компонентов). */
	engine: TCollectionEngine<TItem, TExtensions>
}

/**
 * Входные props владельца коллекции, принимаемые фасадом.
 * Пока общие для всех коллекций (items + trackBy); специфичные выносятся отдельно.
 */
export type TCollectionFacadeProps<TItem = any, TItemProps = any> = {
	items?: (TCollectionEngineItemSource<TItemProps> | TItem)[]
	trackBy?: (item: TCollectionEngineItemSource<TItem> | TItem) => unknown
}

/**
 * Опции конструктора фасада владельца коллекции:
 * либо готовая коллекция `engine`, либо `owner` для её создания.
 */
export type TCollectionFacadeOptions<TCollection = unknown, TOwner = unknown> = {
	engine?: TCollection
	owner?: TOwner
}
