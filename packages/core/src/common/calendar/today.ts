import { dateFromParts, dateTimeOf } from './date'
import { DEFAULT_LOCALE } from './locale.class'
import type { TCalendarDate, TCalendarDateTime } from './types'

/**
 * Числа текущего момента: григорианский календарь, латинские цифры и часы от 0
 * до 23, что бы ни стояло у локали, — их разбирают `dateFromParts` и
 * `dateTimeOf`.
 */
const NOW: Intl.DateTimeFormatOptions = {
	calendar: 'gregory',
	numberingSystem: 'latn',
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
	hour: 'numeric',
	minute: 'numeric',
	hourCycle: 'h23',
}

/** Числа даты и времени текущего момента. */
type TNowParts = {
	readonly year: number
	readonly month: number
	readonly day: number
	readonly hour: number
	readonly minute: number
}

/** Форматтеры по поясу. Заводятся при первом обращении, а не при загрузке модуля. */
let formatters: Map<string, Intl.DateTimeFormat> | undefined

/**
 * Сегодняшняя дата в часовом поясе `timeZone`; не задан — пояс среды.
 *
 * Около полуночи сервер в `UTC` и браузер в `UTC+3` живут в разных днях.
 * Заданный пояс даёт обоим один день — и одну отметку «сегодня» в разметке.
 * Невалидный пояс — пояс среды: бросать из-за пропа нельзя, а без даты
 * календарь не соберётся.
 */
export function todayDate(timeZone?: string): TCalendarDate {
	const { year, month, day } = nowParts(timeZone)

	return dateFromParts(year, month, day)
}

/**
 * Текущая дата со временем в часовом поясе `timeZone` — с точностью до минуты;
 * пояс — как у `todayDate`.
 */
export function nowDateTime(timeZone?: string): TCalendarDateTime {
	const { year, month, day, hour, minute } = nowParts(timeZone)

	return dateTimeOf(dateFromParts(year, month, day), hour, minute)
}

function nowParts(timeZone: string | undefined): TNowParts {
	const parts = formatterIn(timeZone).formatToParts(Date.now())
	const part = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((item) => item.type === type)?.value)

	return {
		year: part('year'),
		month: part('month'),
		day: part('day'),
		hour: part('hour'),
		minute: part('minute'),
	}
}

function formatterIn(timeZone: string | undefined): Intl.DateTimeFormat {
	const key = timeZone ?? ''

	formatters ??= new Map()

	let formatter = formatters.get(key)

	if (formatter === undefined) {
		formatter = createFormatter(timeZone)
		formatters.set(key, formatter)
	}

	return formatter
}

function createFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
	try {
		return new Intl.DateTimeFormat(DEFAULT_LOCALE, { ...NOW, timeZone })
	} catch {
		return new Intl.DateTimeFormat(DEFAULT_LOCALE, NOW)
	}
}
