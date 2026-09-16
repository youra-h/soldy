import type { IComponentOptions, TComponentEvents } from '../../component'
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
 * Начинается с `TComponentEvents`, как карта любого компонента: констрейнт
 * `TEvents` у базы (`TComponent`) — закрытая корневая карта, и карта фасада
 * обязана её содержать. Там же объявлено событие шины фасада
 * (`bundle:create`). Индекса у корневой карты нет, поэтому пересечение с ней
 * имён не открывает.
 *
 * Набор расширений в аргументе движка — `any`: иначе карта тянула бы за собой
 * `TExtensions`, а движок инвариантен по нему через `engine:create`.
 */
export type TCollectionComponentEvents<TItem extends object> = TComponentEvents &
	TPlainEvents<TItem> &
	TCollectionEngineEvents<TCollectionEngine<TItem, any>>

/** События фасада коллекции с расширением `batch`: набор базы плюс карта `batch`. */
export type TBatchCollectionFacadeEvents<TItem extends object> = TCollectionComponentEvents<TItem> &
	TBatchEvents<TItem>

/** События фасада коллекции с расширением `selection`: набор `batch` плюс карта `selection`. */
export type TSelectionCollectionFacadeEvents<TItem extends object> =
	TBatchCollectionFacadeEvents<TItem> & TSelectionEvents<TItem>

/**
 * События фасада элемента с расширением `order` — карта его адаптера.
 *
 * Начинается с `TComponentEvents`: констрейнт `TEvents` у базы
 * (`TCollectionItemComponent`) — закрытая корневая карта. Фасады элементов
 * ниже получают её через эту карту.
 */
export type TOrderItemFacadeEvents = TComponentEvents & TOrderItemEventsExtension

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
