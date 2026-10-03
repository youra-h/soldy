import type { TCalendarDate, TCalendarDateTime, TDateUnit, TMonthGridDay, TWeekday } from './types'

/** Первая поддерживаемая дата: у года четыре цифры. */
export const FIRST_DATE: TCalendarDate = '0001-01-01'

/** Последняя поддерживаемая дата. */
export const LAST_DATE: TCalendarDate = '9999-12-31'

/** Номера первой и последней поддерживаемых дат — дни от `1970-01-01`. */
const FIRST_DAY = -719162
const LAST_DAY = 2932896

/** Номера месяцев `0001-01` и `9999-12`: год × 12 плюс месяц от нуля. */
const FIRST_MONTH = 12
const LAST_MONTH = 119999

/** Длина дня в мс — шаг от номера дня к метке времени `Date`. */
const DAY_MS = 86_400_000

/** Дни недели по порядку: номер — по модулю семи, без приведения к `TWeekday`. */
const WEEKDAYS: readonly TWeekday[] = [0, 1, 2, 3, 4, 5, 6]

/** Длины месяцев невисокосного года. */
const MONTH_LENGTHS: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** Формат даты — ровно четыре цифры года. */
const DATE_FORMAT = /^(\d{4})-(\d{2})-(\d{2})$/

/** Формат даты со временем — дата, `T`, час и минута по две цифры. */
const DATE_TIME_FORMAT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/**
 * Части даты без проверки: год от четырёх цифр. У заполнителей сетки за
 * краями поддерживаемых дат год бывает нулевым (`0000`) и пятизначным.
 */
const DATE_PARTS = /^(\d{4,})-(\d{2})-(\d{2})$/

/** Сдвиг даты по единицам: неделя — семь дней. */
const SHIFTS: Readonly<Record<TDateUnit, (date: TCalendarDate, count: number) => TCalendarDate>> = {
	day: addDays,
	week: (date, count) => addDays(date, whole(count) * 7),
	month: addMonths,
	year: addYears,
}

/**
 * Дата из строки: `YYYY-MM-DD` с годом от `0001` до `9999` и днём, который
 * есть в месяце. Всё остальное — `02-30`, `2026-9-5`, время после даты, не
 * строка — `undefined`.
 */
export function parseDate(value: unknown): TCalendarDate | undefined {
	if (typeof value !== 'string') return undefined

	const match = DATE_FORMAT.exec(value)

	if (!match) return undefined

	// Формат уже ровно `YYYY-MM-DD`: собранная из тех же чисел строка — она же
	return dateIfExists(Number(match[1]), Number(match[2]), Number(match[3]))
}

/**
 * Дата со временем из строки: `YYYY-MM-DDTHH:mm` с датой, которая есть
 * (`parseDate`), часом от `00` до `23` и минутой от `00` до `59`. Всё остальное
 * — дата без времени, секунды, часовой пояс, `24:00`, не строка — `undefined`.
 */
export function parseDateTime(value: unknown): TCalendarDateTime | undefined {
	if (typeof value !== 'string') return undefined

	const match = DATE_TIME_FORMAT.exec(value)

	if (!match) return undefined

	return dateTimeIfExists(
		Number(match[1]),
		Number(match[2]),
		Number(match[3]),
		Number(match[4]),
		Number(match[5]),
	)
}

/**
 * Порядок дат: меньше нуля — `a` раньше. У четырёхзначного года порядок строк
 * и есть порядок дат. Длина идёт первым ключом ради заполнителей сетки за
 * `9999-12-31`: пятизначный год позже любого четырёхзначного.
 */
export function compareDates(a: TCalendarDate, b: TCalendarDate): number {
	if (a.length !== b.length) return a.length - b.length
	if (a === b) return 0

	return a < b ? -1 : 1
}

/** Дата в отрезке `[min, max]`; `max` раньше `min` — отрезок схлопывается в `min`. */
export function clampDate(
	date: TCalendarDate,
	min: TCalendarDate,
	max: TCalendarDate,
): TCalendarDate {
	const upper = compareDates(date, max) > 0 ? max : date

	return compareDates(upper, min) < 0 ? min : upper
}

/** Две даты по возрастанию. */
export function orderDates(a: TCalendarDate, b: TCalendarDate): [TCalendarDate, TCalendarDate] {
	return compareDates(a, b) <= 0 ? [a, b] : [b, a]
}

/*
 * Сдвиги. Аргумент — проверенная дата (`parseDate`), результат не выходит за
 * поддерживаемые даты: сдвиг за край останавливается на краю. Число сдвига —
 * целое: дробное округляется, `NaN` — ноль, бесконечность доводит до края.
 */

/** Дата через `count` дней. */
export function addDays(date: TCalendarDate, count: number): TCalendarDate {
	return fromDays(clampDays(toDays(date) + whole(count)))
}

/** Дата через `count` месяцев; число прижимается к длине месяца: `01-31` плюс месяц — `02-28`. */
export function addMonths(date: TCalendarDate, count: number): TCalendarDate {
	const [year, month, day] = partsOf(date)
	const index = year * 12 + month - 1 + whole(count)

	if (index < FIRST_MONTH) return FIRST_DATE
	if (index > LAST_MONTH) return LAST_DATE

	const nextYear = Math.floor(index / 12)
	const nextMonth = (index % 12) + 1

	return compose(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)))
}

/** Дата через `count` лет; 29 февраля в невисокосном году — 28-е. */
export function addYears(date: TCalendarDate, count: number): TCalendarDate {
	return addMonths(date, whole(count) * 12)
}

/** Дата через `count` единиц. */
export function shiftDate(date: TCalendarDate, unit: TDateUnit, count: number): TCalendarDate {
	return SHIFTS[unit](date, count)
}

/** День недели даты. */
export function dayOfWeek(date: TCalendarDate): TWeekday {
	return weekdayOf(toDays(date) + EPOCH_WEEKDAY)
}

/** Первый день недели, в которой лежит дата; неделя начинается с `first`. */
export function startOfWeek(date: TCalendarDate, first: TWeekday): TCalendarDate {
	const days = toDays(date)

	return fromDays(clampDays(days - weekOffset(days, first)))
}

/** Последний день недели, в которой лежит дата. */
export function endOfWeek(date: TCalendarDate, first: TWeekday): TCalendarDate {
	const days = toDays(date)

	return fromDays(clampDays(days + 6 - weekOffset(days, first)))
}

/** Первое число месяца даты. */
export function startOfMonth(date: TCalendarDate): TCalendarDate {
	const [year, month] = partsOf(date)

	return compose(year, month, 1)
}

/** Год даты — число, без ведущих нулей. */
export function yearOf(date: TCalendarDate): number {
	return partsOf(date)[0]
}

/** Сколько месяцев от месяца `from` до месяца `to`; числа месяца не в счёт. */
export function monthsBetween(from: TCalendarDate, to: TCalendarDate): number {
	const [fromYear, fromMonth] = partsOf(from)
	const [toYear, toMonth] = partsOf(to)

	return (toYear - fromYear) * 12 + toMonth - fromMonth
}

/**
 * Сетка месяца: целые недели от `first`, 4–6 строк. Дни соседних месяцев
 * помечены — ими сетка добирает первую и последнюю недели до целых.
 *
 * Заполнители у краёв поддерживаемых дат не прижимаются: неделя `0001-01`
 * может начаться в нулевом году, а у `9999-12` — закончиться в десятитысячном.
 * Прижатие дало бы в сетке одну дату дважды.
 */
export function monthGrid(month: TCalendarDate, first: TWeekday): TMonthGridDay[][] {
	const [year, monthNumber] = partsOf(month)
	const start = daysFromCivil(year, monthNumber, 1)
	const end = start + daysInMonth(year, monthNumber) - 1
	const weeks: TMonthGridDay[][] = []

	for (let week = start - weekOffset(start, first); week <= end; week += 7) {
		weeks.push(
			Array.from({ length: 7 }, (_, index) => {
				const day = week + index

				return { date: fromDays(day), outside: day < start || day > end }
			}),
		)
	}

	return weeks
}

/** Дата по году, месяцу и дню — в пределах поддерживаемых дат. */
export function dateFromParts(year: number, month: number, day: number): TCalendarDate {
	return fromDays(clampDays(daysFromCivil(year, month, day)))
}

/**
 * Дата ровно из этих чисел, если такая есть: год от 1 до 9999, месяц от 1 до
 * 12, день есть в месяце. Иначе `undefined` — в отличие от `dateFromParts`,
 * который уносит 31 февраля в март.
 */
export function dateIfExists(year: number, month: number, day: number): TCalendarDate | undefined {
	const integers = [year, month, day].every((value) => Number.isInteger(value))

	if (!integers || year < 1 || year > 9999 || month < 1 || month > 12) return undefined
	if (day < 1 || day > daysInMonth(year, month)) return undefined

	return compose(year, month, day)
}

/**
 * Дата со временем ровно из этих чисел, если такая есть: дата — как у
 * `dateIfExists`, час — целое от 0 до 23, минута — от 0 до 59. Иначе
 * `undefined`.
 */
export function dateTimeIfExists(
	year: number,
	month: number,
	day: number,
	hour: number,
	minute: number,
): TCalendarDateTime | undefined {
	const date = dateIfExists(year, month, day)
	const integers = Number.isInteger(hour) && Number.isInteger(minute)

	if (date === undefined || !integers || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
		return undefined
	}

	return dateTimeOf(date, hour, minute)
}

/** Строка даты со временем: дата, `T`, час и минута по две цифры. Числа не проверяются. */
export function dateTimeOf(date: TCalendarDate, hour: number, minute: number): TCalendarDateTime {
	return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

/** Дней в месяце года; месяц — от 1 до 12. */
export function daysInMonth(year: number, month: number): number {
	return month === 2 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month - 1]
}

/**
 * Полночь даты в `UTC` — то, что форматируют подписи. Метка времени считается
 * от номера дня, а не `Date.UTC`: тот уносит годы 0–99 в 1900-е.
 */
export function utcDateOf(date: TCalendarDate): Date {
	return new Date(toDays(date) * DAY_MS)
}

/** День недели по любому целому: номер берётся по модулю семи. */
export function weekdayOf(value: number): TWeekday {
	return WEEKDAYS[((value % 7) + 7) % 7]
}

/** Целое ли это от 0 до 6 — день недели. */
export function isWeekday(value: unknown): value is TWeekday {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}

/* ------------------------------------------------------------------ */
/* Номер дня                                                          */
/* ------------------------------------------------------------------ */

/** День недели `1970-01-01` — четверг. */
const EPOCH_WEEKDAY = 4

/** Сколько дней от начала недели `first` до дня с номером `days`. */
function weekOffset(days: number, first: TWeekday): number {
	return weekdayOf(days + EPOCH_WEEKDAY - first)
}

/** Номер дня даты. Разбор без проверки: аргумент — дата календаря или заполнитель сетки. */
function toDays(date: TCalendarDate): number {
	const [year, month, day] = partsOf(date)

	return daysFromCivil(year, month, day)
}

/** Дата по номеру дня — без прижатия. */
function fromDays(days: number): TCalendarDate {
	const [year, month, day] = civilFromDays(days)

	return compose(year, month, day)
}

/** Номер дня в пределах поддерживаемых дат. */
function clampDays(days: number): number {
	return Math.min(Math.max(days, FIRST_DAY), LAST_DAY)
}

/**
 * Номер дня по году, месяцу и дню — `days_from_civil` Говарда Хиннанта для
 * пролептического григорианского календаря. Год считается с марта: високосный
 * день становится последним в году, и длины месяцев укладываются в формулу.
 */
function daysFromCivil(year: number, month: number, day: number): number {
	const y = month <= 2 ? year - 1 : year
	const era = Math.floor(y / 400)
	const yearOfEra = y - era * 400
	const dayOfYear = Math.floor((153 * ((month + 9) % 12) + 2) / 5) + day - 1
	const dayOfEra =
		yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear

	return era * 146097 + dayOfEra - 719468
}

/** Год, месяц и день по номеру дня — обратное к `daysFromCivil`. */
function civilFromDays(days: number): [number, number, number] {
	const shifted = days + 719468
	const era = Math.floor(shifted / 146097)
	const dayOfEra = shifted - era * 146097
	const yearOfEra = Math.floor(
		(dayOfEra -
			Math.floor(dayOfEra / 1460) +
			Math.floor(dayOfEra / 36524) -
			Math.floor(dayOfEra / 146096)) /
			365,
	)
	const dayOfYear =
		dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
	const marchMonth = Math.floor((5 * dayOfYear + 2) / 153)
	const day = dayOfYear - Math.floor((153 * marchMonth + 2) / 5) + 1
	const month = marchMonth < 10 ? marchMonth + 3 : marchMonth - 9

	return [yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day]
}

/** Год, месяц и день даты; не дата — `NaN`. */
function partsOf(date: TCalendarDate): [number, number, number] {
	const match = DATE_PARTS.exec(date)

	if (!match) return [Number.NaN, Number.NaN, Number.NaN]

	return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Строка даты из частей: год — не короче четырёх цифр. */
function compose(year: number, month: number, day: number): TCalendarDate {
	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isLeapYear(year: number): boolean {
	return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

/** Число шагов сдвига — целое. */
function whole(count: number): number {
	return Math.round(count) || 0
}
