import { dateFromParts } from './date'
import { DEFAULT_LOCALE } from '../locale'
import type { TCalendarDate } from './types'

/**
 * Числа сегодняшней даты: григорианский календарь и латинские цифры, что бы
 * ни стояло у локали, — их разбирает `dateFromParts`.
 */
const TODAY: Intl.DateTimeFormatOptions = {
	calendar: 'gregory',
	numberingSystem: 'latn',
	year: 'numeric',
	month: 'numeric',
	day: 'numeric',
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
	const parts = formatterIn(timeZone).formatToParts(Date.now())
	const part = (type: Intl.DateTimeFormatPartTypes): number =>
		Number(parts.find((item) => item.type === type)?.value)

	return dateFromParts(part('year'), part('month'), part('day'))
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
		return new Intl.DateTimeFormat(DEFAULT_LOCALE, { ...TODAY, timeZone })
	} catch {
		return new Intl.DateTimeFormat(DEFAULT_LOCALE, TODAY)
	}
}
