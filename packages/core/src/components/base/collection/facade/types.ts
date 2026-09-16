import type { IComponentOptions } from '../../component'
import type {
	TCollectionEngine,
	IExtension,
	TCollectionEngineItemSource,
	TCollectionEngineEvents,
	TCollectionStorageDriverEvents,
	TBatchEvents,
	TSelectionEvents,
	TOrderItemEventsExtension,
	TSelectionItemEventsExtension,
} from '../engine'

/**
 * События фасада владельца коллекции — карта цели его релеев.
 *
 * Объявлена точным набором, а не `Record<string, …>`, и ставится у базы **и в
 * констрейнт `TEvents`, и в дефолт**: констрейнт сверяет релеи в теле самой
 * базы (`keyof` дженерика раскрывается по констрейнту), дефолт — конечные
 * фасады, которые параметр не передают. С открытой картой проверка
 * `TEvented.relay` пропускала любое имя с любым обработчиком.
 *
 * Имена и аргументы не переписаны руками, а взяты `Pick`-ом с карт источников:
 * переименование события в источнике ломает компиляцию здесь, а не оставляет
 * в фасаде мёртвое имя.
 */
export type TCollectionComponentEvents<TItem extends object> = Pick<
	TCollectionStorageDriverEvents<TItem>,
	| 'item:add:before'
	| 'item:added'
	| 'item:remove:before'
	| 'item:removed'
	| 'item:update:before'
	| 'item:updated'
	| 'item:move:before'
	| 'item:moved'
	| 'items:clear:before'
	| 'change:items'
	| 'change:count'
	| 'reset'
> &
	// `engine:create` приходит от самого движка. Набор расширений в аргументе
	// `any`: иначе карта событий фасада тянула бы за собой `TExtensions`, а
	// движок инвариантен по нему через это же событие.
	TCollectionEngineEvents<TCollectionEngine<TItem, any>>

/** События фасада коллекции с расширением `batch`: набор базы плюс состав и `trackBy`. */
export type TBatchCollectionFacadeEvents<TItem extends object> =
	TCollectionComponentEvents<TItem> &
		Pick<TBatchEvents<TItem>, 'items:added' | 'items:removed' | 'change:trackBy' | 'change:shown'>

/** События фасада коллекции с расширением `selection`: набор `batch` плюс выбор и режим. */
export type TSelectionCollectionFacadeEvents<TItem extends object> =
	TBatchCollectionFacadeEvents<TItem> &
		Pick<TSelectionEvents<TItem>, 'change:selection' | 'change:mode'>

/** События фасада элемента с расширением `order`. */
export type TOrderItemFacadeEvents = Pick<TOrderItemEventsExtension, 'change:order'>

/** События фасада элемента, который можно выбрать: набор `order` плюс `change:selected`. */
export type TSelectionItemFacadeEvents = TOrderItemFacadeEvents &
	Pick<TSelectionItemEventsExtension, 'change:selected'>

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
