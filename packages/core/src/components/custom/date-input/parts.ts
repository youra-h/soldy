import {
	DATE_PARTS,
	dateIfExists,
	daysInMonth,
	formatFieldNumber,
	parseDate,
} from '../../../common'
import type { IDateFieldFormat, TCalendarDate, TDatePart } from '../../../common'
import type { TDateInputParts, TDatePartLimits, TDigitEntry, TDigitErase } from './types'

/**
 * Правила частей поля даты — чистые функции над числами частей.
 *
 * Числа частей хранятся григорианскими (`TDateInputParts`), а ход, набор и
 * текст — в числах, которые видит пользователь: год — в календаре поля,
 * буддийский у `th-TH` больше григорианского на `yearOffset`.
 */

/** Високосный год: месяц без года не короче своей наибольшей длины — февраль 29 дней. */
const LEAP_YEAR = 2000

/** Сколько цифр минимум в тексте части: день и месяц — две, год — как есть. */
const WIDTH: Readonly<Record<TDatePart, number>> = { day: 2, month: 2, year: 1 }

/**
 * Ход части. День не длиннее месяца, а пока года нет — не длиннее
 * наибольшей длины месяца; без месяца — 31. Год — поддерживаемые даты,
 * `0001`–`9999`, в календаре поля.
 */
const LIMITS: Readonly<
	Record<TDatePart, (parts: TDateInputParts, yearOffset: number) => TDatePartLimits>
> = {
	day: (parts) => ({ min: 1, max: dayMax(parts) }),
	month: () => ({ min: 1, max: 12 }),
	year: (_, yearOffset) => ({ min: 1 + yearOffset, max: 9999 + yearOffset }),
}

/** Шаг ↑/↓: день и месяц идут по кругу, год — в своих пределах. */
const STEP: Readonly<Record<TDatePart, (value: number, min: number, max: number) => number>> = {
	day: wrap,
	month: wrap,
	year: clamp,
}

/** Части даты; не дата — пусто. */
export function partsOf(value: unknown): TDateInputParts {
	const date = parseDate(value)

	if (date === undefined) return {}

	return {
		year: Number(date.slice(0, -6)),
		month: Number(date.slice(-5, -3)),
		day: Number(date.slice(-2)),
	}
}

/** Дата из частей — только когда есть все три и такая дата существует. */
export function dateOf({ day, month, year }: TDateInputParts): TCalendarDate | undefined {
	if (day === undefined || month === undefined || year === undefined) return undefined

	return dateIfExists(year, month, day)
}

/** Одинаковы ли части. */
export function sameParts(a: TDateInputParts, b: TDateInputParts): boolean {
	return DATE_PARTS.every((part) => a[part] === b[part])
}

/** Пусты ли все части. */
export function emptyParts(parts: TDateInputParts): boolean {
	return DATE_PARTS.every((part) => parts[part] === undefined)
}

/**
 * Части с новым числом части (`undefined` — очистить). Смена месяца или года
 * прижимает день к длине месяца: 31-е в апреле — 30-е.
 */
export function withPart(
	parts: TDateInputParts,
	part: TDatePart,
	value: number | undefined,
): TDateInputParts {
	const next: TDateInputParts = { ...parts, [part]: value }
	const { day } = next

	return day !== undefined && day > dayMax(next) ? { ...next, day: dayMax(next) } : next
}

/** Части без частей `cleared`. */
export function withoutParts(
	parts: TDateInputParts,
	cleared: readonly TDatePart[],
): TDateInputParts {
	return cleared.reduce((next, part) => withPart(next, part, undefined), parts)
}

/** Ход части в числах, которые видит пользователь. */
export function limitsOf(
	part: TDatePart,
	parts: TDateInputParts,
	yearOffset: number,
): TDatePartLimits {
	return LIMITS[part](parts, yearOffset)
}

/** Число части, которое видит пользователь: год — в календаре поля. Пустая — `undefined`. */
export function shownOf(
	part: TDatePart,
	parts: TDateInputParts,
	yearOffset: number,
): number | undefined {
	const value = parts[part]

	if (value === undefined) return undefined

	return part === 'year' ? value + yearOffset : value
}

/** Число части для хранения — из числа, которое видит пользователь. */
export function storedOf(part: TDatePart, shown: number, yearOffset: number): number {
	return part === 'year' ? shown - yearOffset : shown
}

/** Текст части: число цифрами локали, у пустой — подсказка. */
export function textOf(part: TDatePart, parts: TDateInputParts, format: IDateFieldFormat): string {
	const shown = shownOf(part, parts, format.yearOffset)

	if (shown === undefined) return format.placeholders[part]

	return formatFieldNumber(shown, WIDTH[part], format.digits)
}

/**
 * Цифра в часть. Цифры копятся, пока число в ходе части, иначе часть
 * начинается с новой цифры. Ноль первой цифрой значения не даёт: из «0» и «5»
 * выйдет 5. Дописать больше некуда — следующая цифра вывела бы за ход или
 * цифр уже столько, сколько у края хода, — набранное сбрасывается, и фокус
 * уходит на следующую часть.
 */
export function enterDigit(
	parts: TDateInputParts,
	typed: string,
	part: TDatePart,
	digit: number,
	yearOffset: number,
): TDigitEntry {
	const entered = `${typed}${digit}`
	const { max } = limitsOf(part, parts, yearOffset)
	const number = Number(entered)
	const value = number > max ? digit : number
	const settable = value !== 0
	const full = Number(`${number}0`) > max || entered.length >= String(max).length

	return {
		parts: settable ? withPart(parts, part, storedOf(part, value, yearOffset)) : parts,
		typed: full ? '' : entered,
		advance: full && settable,
	}
}

/**
 * Стереть последнюю цифру текста части: «12» — 1, «05» — пусто. Дальше набор
 * дописывает к тому, что осталось. Пустая часть стирать нечего — `undefined`.
 */
export function eraseDigit(
	parts: TDateInputParts,
	part: TDatePart,
	yearOffset: number,
): TDigitErase | undefined {
	const shown = shownOf(part, parts, yearOffset)

	if (shown === undefined) return undefined

	const rest = String(shown).padStart(WIDTH[part], '0').slice(0, -1)
	const number = Number(rest)

	if (!Number.isFinite(number) || number === 0) {
		return { parts: withPart(parts, part, undefined), typed: '' }
	}

	return { parts: withPart(parts, part, storedOf(part, number, yearOffset)), typed: rest }
}

/**
 * Шаг ↑/↓ части на `count`: день и месяц — по кругу, год — до края хода.
 * Пустая часть шаг не делает, а начинает с числа сегодняшней даты `today`.
 */
export function stepPart(
	parts: TDateInputParts,
	part: TDatePart,
	count: number,
	yearOffset: number,
	today: TDateInputParts,
): TDateInputParts {
	const { min, max } = limitsOf(part, parts, yearOffset)
	const shown = shownOf(part, parts, yearOffset)
	const next =
		shown === undefined
			? clamp(shownOf(part, today, yearOffset) ?? min, min, max)
			: STEP[part](shown + Math.round(count), min, max)

	return withPart(parts, part, storedOf(part, next, yearOffset))
}

/** Наибольший день: длина месяца года, без года — наибольшая длина месяца, без месяца — 31. */
function dayMax({ month, year }: TDateInputParts): number {
	if (month === undefined) return 31

	return daysInMonth(year ?? LEAP_YEAR, month)
}

/** Число в отрезке. */
function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/** Число по кругу отрезка: за концом — начало, перед началом — конец. */
function wrap(value: number, min: number, max: number): number {
	const size = max - min + 1

	return ((((value - min) % size) + size) % size) + min
}
