import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../base/value-control'
import type { TCalendarDate, TWeekday } from '../../../common'
import type { ICalendarCollectionProps } from './collection/types'

/** Диапазон дат: начало и конец по возрастанию; одна дата — однодневный диапазон. */
export type TCalendarRange = [TCalendarDate, TCalendarDate]

/**
 * Значение календаря. Форма — по режиму выбора коллекции: `single` — дата или
 * `undefined`, `multiple` — даты по возрастанию без повторов, `range` —
 * диапазон или `undefined`.
 *
 * Календарь хранит его как задано. Что из него выбрано, решает расширение
 * выбора коллекции: строки не в формате даты выпадают, недоступные дни и дни
 * вне границ остаются — это данные потребителя.
 */
export type TCalendarValue = TCalendarDate | TCalendarDate[] | TCalendarRange | undefined

/**
 * Недоступен ли день: `true` — фокус на день встаёт, но выбрать его нельзя, и
 * концом диапазона он не бывает. Диапазон через недоступный день проходит.
 *
 * `anchor` — якорь начатого диапазона, первый выбранный конец; диапазон не
 * начат — `undefined`. По нему потребитель выражает «не через занятые дни» и
 * «не дольше N ночей» той же функцией, без отдельных флагов.
 */
export type TCalendarUnavailable = (
	date: TCalendarDate,
	anchor: TCalendarDate | undefined,
) => boolean

/** Заголовок колонки — день недели. */
export type TCalendarWeekday = {
	/** Короткое имя — подпись колонки (`Mon`) */
	short: string
	/** Полное имя — для скринридера (`Monday`, `abbr` у `<th>`) */
	long: string
}

export type TCalendarEvents = TValueControlEvents<TCalendarValue> & {
	/** change:min */
	'change:min': (value: TCalendarDate | undefined) => void
	/** change:max */
	'change:max': (value: TCalendarDate | undefined) => void
	/** change:unavailable */
	'change:unavailable': (value: TCalendarUnavailable | undefined) => void
	/** change:weekStart */
	'change:weekStart': (value: TWeekday | undefined) => void
	/** change:locale */
	'change:locale': (value: string) => void
	/** change:timeZone */
	'change:timeZone': (value: string | undefined) => void
	/** Сменились показанные месяцы — записью, листанием или уходом фокуса */
	'change:months': (value: TCalendarDate[] | undefined) => void
}

/** Пропсы самого календаря (без коллекционной части). */
export interface ICalendarComponentProps extends IValueControlProps<TCalendarValue> {
	/** Первый день, который можно выбрать; раньше — ни фокуса, ни выбора */
	min?: TCalendarDate
	/** Последний день, который можно выбрать */
	max?: TCalendarDate
	/** Недоступные дни: фокус на них встаёт, выбор — нет */
	unavailable?: TCalendarUnavailable
	/** Первый день недели; не задан — по локали */
	weekStart?: TWeekday
	/** Локаль подписей и первого дня недели (BCP 47) */
	locale?: string
	/** Часовой пояс «сегодня» (IANA); не задан — пояс среды */
	timeZone?: string
	/**
	 * Месяц каждой сетки — любая дата месяца, по сетке на элемент. Месяцы
	 * независимы: рядом могут стоять январь и сентябрь. Не заданы — одна
	 * сетка на месяце фокуса
	 */
	months?: TCalendarDate[]
}

/** Полный набор пропсов календаря: свои и коллекционные (`mode`). */
export interface ICalendarProps extends ICalendarComponentProps, ICalendarCollectionProps {}

export interface ICalendar extends IValueControl<TCalendarValue, ICalendarProps, TCalendarEvents> {
	/** Первый день, который можно выбрать */
	min: TCalendarDate | undefined
	/** Последний день, который можно выбрать */
	max: TCalendarDate | undefined
	/** Недоступные дни */
	unavailable: TCalendarUnavailable | undefined
	/** Первый день недели; `undefined` — по локали */
	weekStart: TWeekday | undefined
	/** Локаль */
	locale: string
	/** Часовой пояс «сегодня» */
	timeZone: string | undefined
	/** Месяцы сеток — как заданы или как их показала коллекция */
	months: TCalendarDate[] | undefined
	/** Первый день недели: `weekStart`, а без него — по локали */
	readonly firstDay: TWeekday
	/** Дни недели — заголовки колонок, от первого дня недели */
	readonly weekdays: TCalendarWeekday[]
}
