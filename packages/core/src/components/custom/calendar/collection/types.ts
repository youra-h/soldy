import type {
	ICollectionProps,
	IOrderItemExtension,
	TBatchExtension,
	TCollectionEngine,
	TFactoryExtension,
	TMetaExtension,
	TOrderExtension,
	TPlainExtension,
	TUniqueExtension,
} from '../../../base/collection'
import type { TBatchCollectionFacadeEvents, TOrderItemFacadeEvents } from '../../../base/collection'
import type { ICalendarItem } from '../item/types'
import type {
	ICalendarFocusItemExtension,
	ICalendarSelectionCollectionProps,
	ICalendarSelectionItemExtension,
	TCalendarEngineOptions,
	TCalendarFocusEvents,
	TCalendarFocusExtension,
	TCalendarFocusItemEvents,
	TCalendarPickerEvents,
	TCalendarPickerExtension,
	TCalendarSelectionEvents,
	TCalendarSelectionExtension,
	TCalendarSelectionItemEvents,
	TCalendarViewEvents,
	TCalendarViewExtension,
} from './extensions'

export type TCalendarCollectionExtensions = {
	factory: TFactoryExtension<ICalendarItem>
	unique: TUniqueExtension<ICalendarItem>
	meta: TMetaExtension<ICalendarItem>
	order: TOrderExtension<ICalendarItem>
	plain: TPlainExtension<ICalendarItem>
	batch: TBatchExtension<ICalendarItem>
	/** Дни показанных месяцев и сетки */
	view: TCalendarViewExtension
	/** Выбор дат */
	selection: TCalendarSelectionExtension
	/** Фокус сетки */
	focus: TCalendarFocusExtension
	/** Панели выбора месяца и года */
	picker: TCalendarPickerExtension
}

export type TCalendarCollection = TCollectionEngine<
	ICalendarItem,
	TCalendarCollectionExtensions,
	TCalendarEngineOptions
>

/**
 * Движок, который принимает фасад: любого уровня сборки, недостающее
 * фасад дополнит сам (`completeEngine`). Оба параметра — `any`: движок
 * инвариантен по набору расширений через `engine:create` (см. ListBox).
 */
export type TCalendarCollectionFacadeEngine = TCollectionEngine<any, any>

/**
 * Owner-level props коллекции календаря — режим выбора и движок снаружи.
 *
 * Движок снаружи — как у остальных коллекций: его держит тот, кто показывает
 * календарь и зовёт команды его расширений (панель DatePicker). Состава
 * (`items`) и ключа сверки (`trackBy`) среди пропсов нет: дни кладёт в
 * коллекцию сам календарь, по показанным месяцам, и ключ — дата.
 */
export interface ICalendarCollectionProps
	extends ICalendarSelectionCollectionProps, ICollectionProps<TCalendarCollectionFacadeEngine> {}

/** Item-адаптеры коллекции календаря — для фасада дня. */
export type TCalendarAdapters = {
	order: IOrderItemExtension<ICalendarItem>
	selection: ICalendarSelectionItemExtension
	focus: ICalendarFocusItemExtension
}

/** События фасада коллекции: база с `batch` плюс карты четырёх расширений календаря. */
export type TCalendarCollectionFacadeEvents = TBatchCollectionFacadeEvents<ICalendarItem> &
	TCalendarViewEvents &
	TCalendarSelectionEvents &
	TCalendarFocusEvents &
	TCalendarPickerEvents

/** События фасада дня: порядок плюс адаптеры выбора и фокуса. */
export type TCalendarItemCollectionFacadeEvents = TOrderItemFacadeEvents &
	TCalendarSelectionItemEvents &
	TCalendarFocusItemEvents
