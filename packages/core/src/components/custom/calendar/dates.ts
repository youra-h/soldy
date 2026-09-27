import { FIRST_DATE, LAST_DATE, compareDates, parseDate } from '../../../common'
import type { TCalendarDate } from '../../../common'
import type { TCalendarValue } from './types'

/** Отрезок дат, которые можно выбрать: от `low` до `high` включительно. */
export type TCalendarBounds = {
	readonly low: TCalendarDate
	readonly high: TCalendarDate
}

/**
 * Границы календаря по `min` и `max`: невалидная граница — край поддерживаемых
 * дат, `max` раньше `min` — отрезок схлопывается в `min`.
 *
 * Одна функция на все расширения коллекции: границы читают и вид (какие
 * месяцы можно показать, какие дни выключены), и фокус, и выбор.
 */
export function calendarBounds(min: unknown, max: unknown): TCalendarBounds {
	const low = parseDate(min) ?? FIRST_DATE
	const high = parseDate(max) ?? LAST_DATE

	return { low, high: compareDates(high, low) < 0 ? low : high }
}

/** Лежит ли дата в отрезке. */
export function inBounds(date: TCalendarDate, bounds: TCalendarBounds): boolean {
	return compareDates(date, bounds.low) >= 0 && compareDates(date, bounds.high) <= 0
}

/**
 * Даты значения: валидные, без повторов, по возрастанию. Строки не в формате
 * даты выпадают; значение любой формы — дата, массив, `undefined` — даёт
 * список.
 */
export function datesOf(value: TCalendarValue): TCalendarDate[] {
	const list: readonly unknown[] = Array.isArray(value) ? value : [value]
	const dates = list.map((item) => parseDate(item)).filter((date) => date !== undefined)

	return [...new Set(dates)].sort(compareDates)
}
