import type {
	IExtension,
	IExtensionItems,
	IItemExtension,
	TBaseItemEventsExtension,
} from '../../../../../base/collection'
import type { TCalendarDate, TDateUnit } from '../../../../../../common'
import type { ICalendarItem } from '../../../item/types'

/** Край недели: `start` — её первый день, `end` — последний. */
export type TCalendarWeekEdge = 'start' | 'end'

export type TCalendarFocusEvents = {
	/** Фокус сетки перешёл на другой день */
	'change:focusedDate': (value: TCalendarDate) => void
}

/**
 * Контракт расширения фокуса: одна остановка Tab на все сетки (roving
 * tabindex по APG, Date Picker Dialog). День с фокусом — всегда в границах и в
 * показанном месяце.
 */
export interface ICalendarFocusExtension<
	// `any` в констрейнте: карта событий item-адаптера инвариантна
	TItemExt extends ICalendarFocusItemExtension<any> = ICalendarFocusItemExtension,
>
	extends
		IExtension<ICalendarItem, TCalendarFocusEvents>,
		IExtensionItems<ICalendarItem, TItemExt> {
	/** День с фокусом */
	readonly focusedDate: TCalendarDate
	/** Поставить фокус на дату; вне границ — на ближайшую границу */
	focusDate(date: TCalendarDate): void
	/** Сдвинуть фокус на `count` дней, недель, месяцев или лет */
	shiftFocus(unit: TDateUnit, count: number): void
	/** Поставить фокус на первый или последний день его недели */
	moveFocusToEdge(edge: TCalendarWeekEdge): void
	/**
	 * Вернуть фокус на старт: первую выбранную дату, иначе сегодня, в
	 * границах, — и показать её месяц
	 */
	resetFocus(): void
}

export type TCalendarFocusItemEvents = TBaseItemEventsExtension & {
	/** Стоит ли на дне фокус — перечитать `focused` */
	'change:focused': () => void
}

/** Item-адаптер фокуса: стоит ли фокус на дне. */
export interface ICalendarFocusItemExtension<
	TEvents extends TCalendarFocusItemEvents = TCalendarFocusItemEvents,
> extends IItemExtension<ICalendarItem, TEvents> {
	/** Стоит ли на дне фокус сетки */
	readonly focused: boolean
	/** Поставить фокус сетки на этот день */
	focus(): void
}
