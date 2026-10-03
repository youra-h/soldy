import { compareDates, dateIfExists, dateTimeIfExists, parseDate, parseDateTime } from './date'
import type {
	IDateFieldFormat,
	TCalendarDate,
	TCalendarDateTime,
	TDateFieldNumbers,
	TDateFieldPart,
	TDateGranularity,
	TDatePart,
	THourCycle,
	TTimePart,
} from './types'

/** Части даты в поле ввода — порядок типов, а не формата: его даёт локаль. */
export const DATE_PARTS: readonly TDatePart[] = ['day', 'month', 'year']

/** Части времени в поле ввода; период суток — только у 12-часового цикла. */
export const TIME_PARTS: readonly TTimePart[] = ['hour', 'minute', 'dayPeriod']

/** Все части поля даты. */
export const FIELD_PARTS: readonly TDateFieldPart[] = [...DATE_PARTS, ...TIME_PARTS]

/**
 * Части поля по точности — без периода суток: его даёт цикл часов локали, а
 * не точность.
 */
export const GRANULARITY_PARTS: Readonly<Record<TDateGranularity, readonly TDateFieldPart[]>> = {
	day: DATE_PARTS,
	minute: [...DATE_PARTS, 'hour', 'minute'],
}

/** Ход часа в цикле и есть ли у цикла период суток. */
type THourCycleRule = {
	readonly min: number
	readonly max: number
	readonly dayPeriod: boolean
}

/**
 * Циклы часов: ход часа, который видит пользователь, и период суток. У
 * 12-часового цикла час — в своей половине суток, её выбирает период.
 */
const HOUR_CYCLES: Readonly<Record<THourCycle, THourCycleRule>> = {
	h11: { min: 0, max: 11, dayPeriod: true },
	h12: { min: 1, max: 12, dayPeriod: true },
	h23: { min: 0, max: 23, dayPeriod: false },
	h24: { min: 1, max: 24, dayPeriod: false },
}

/** Часов в половине суток — шаг периода. */
const HALF_DAY = 12

/** Разделитель даты и времени в значении: `YYYY-MM-DDTHH:mm`. */
const TIME_SEPARATOR = 'T'

/**
 * Метки направления и изолирующие знаки. В литералах формата их ставит Intl
 * (`ar-EG` — RLM перед «/»), а в тексте даты, который вставляют в поле, они не
 * значат ничего: разбор их не считает.
 */
const DIRECTION_MARKS = /[؜‎‏‪-‮⁦-⁩]/g

/** Группы цифр текста, уже приведённого к цифрам ASCII. */
const DIGIT_GROUPS = /\d+/g

/**
 * Строгий разбор ISO по точности поля: дата — `YYYY-MM-DD`, со временем —
 * `YYYY-MM-DDTHH:mm`.
 */
const ISO: Readonly<
	Record<TDateGranularity, (text: string) => TCalendarDate | TCalendarDateTime | undefined>
> = {
	day: parseDate,
	minute: parseDateTime,
}

/** Значение по числам частей — по точности: дата или дата со временем. */
const COMPOSE: Readonly<
	Record<
		TDateGranularity,
		(numbers: TDateFieldNumbers) => TCalendarDate | TCalendarDateTime | undefined
	>
> = {
	day: ({ year, month, day }) =>
		year === undefined || month === undefined || day === undefined
			? undefined
			: dateIfExists(year, month, day),
	minute: ({ year, month, day, hour, minute }) =>
		year === undefined ||
		month === undefined ||
		day === undefined ||
		hour === undefined ||
		minute === undefined
			? undefined
			: dateTimeIfExists(year, month, day, hour, minute),
}

/**
 * Числа частей из текста по точности — в числах, которые хранит поле: год — из
 * календаря поля, час — из цикла формата и периода в тексте. `read` — число
 * группы цифр части.
 */
const FROM_TEXT: Readonly<
	Record<
		TDateGranularity,
		(
			read: (part: TDateFieldPart) => number,
			text: string,
			format: IDateFieldFormat,
		) => TDateFieldNumbers
	>
> = {
	day: (read, _, format) => ({
		year: read('year') - format.yearOffset,
		month: read('month'),
		day: read('day'),
	}),
	minute: (read, text, format) => ({
		...FROM_TEXT.day(read, text, format),
		hour: hourOfText(read('hour'), text, format),
		minute: read('minute'),
	}),
}

/** Часть ли поля даты это: даты или времени. */
export function isFieldPart(value: unknown): value is TDateFieldPart {
	return FIELD_PARTS.some((part) => part === value)
}

/**
 * Цифра в знаке: цифра ASCII, цифра системы счисления локали (`digits`) или
 * полноширинная — её приводит к ASCII нормализация NFKC, как и прочие
 * совместимые формы цифр. Не цифра — `undefined`.
 */
export function digitOf(char: string, digits: readonly string[]): number | undefined {
	const normalized = char.normalize('NFKC')

	if (normalized.length === 1 && normalized >= '0' && normalized <= '9') return Number(normalized)

	const index = digits.indexOf(char)

	return index === -1 ? undefined : index
}

/**
 * Целое цифрами локали, не короче `width` цифр: день, месяц, час и минута поля
 * — двумя, год — как есть. Знак минуса остаётся знаком: отрицательный год
 * бывает только у недописанного года, набранного в календаре со сдвигом.
 */
export function formatFieldNumber(value: number, width: number, digits: readonly string[]): string {
	const text = String(Math.abs(Math.trunc(value))).padStart(width, '0')
	const local = [...text].map((char) => digits[Number(char)] ?? char).join('')

	return value < 0 ? `-${local}` : local
}

/** Ход часа, который видит пользователь, в цикле: у `h12` — 1–12, у `h23` — 0–23. */
export function hourLimits(cycle: THourCycle): { readonly min: number; readonly max: number } {
	const { min, max } = HOUR_CYCLES[cycle]

	return { min, max }
}

/** Есть ли у цикла период суток — у 12-часового есть. */
export function hasDayPeriod(cycle: THourCycle): boolean {
	return HOUR_CYCLES[cycle].dayPeriod
}

/** Час, который видит пользователь в цикле, по часу суток (0–23): 14 у `h12` — 2, 0 — 12. */
export function hourInCycle(hour: number, cycle: THourCycle): number {
	const { min, max } = HOUR_CYCLES[cycle]
	const size = max - min + 1

	return ((((hour - min) % size) + size) % size) + min
}

/**
 * Час суток (0–23) по часу, который видит пользователь в цикле, и периоду
 * суток: 0 — до полудня, 1 — после. Период сдвигает час на половину суток, а у
 * 24-часового цикла его нет: 12 у `h12` до полудня — 0, после — 12; 24 у `h24`
 * — 0.
 */
export function hourOfDay(shown: number, cycle: THourCycle, period: number): number {
	const { min, max, dayPeriod } = HOUR_CYCLES[cycle]
	const size = max - min + 1

	return (shown % size) + (dayPeriod ? period * HALF_DAY : 0)
}

/** Значение поля даты: дата или дата со временем. Остальное — `undefined`. */
export function parseFieldValue(value: unknown): TCalendarDate | TCalendarDateTime | undefined {
	return parseDate(value) ?? parseDateTime(value)
}

/**
 * Порядок значений поля: меньше нуля — `a` раньше. Два момента сравниваются до
 * минуты, а дата с моментом — по дню, с точностью грубейшего из двух:
 * граница-дата `max` пропускает любое время своего дня, а дата проходит
 * границу-момент своего дня.
 */
export function compareFieldValues(
	a: TCalendarDate | TCalendarDateTime,
	b: TCalendarDate | TCalendarDateTime,
): number {
	if (!hasTime(a) || !hasTime(b)) return compareDates(dayOf(a), dayOf(b))
	if (a === b) return 0

	return a < b ? -1 : 1
}

/**
 * Лежит ли значение поля в границах `min` и `max` — дат или дат со временем.
 * Невалидная граница не ограничивает, `max` раньше `min` — граница
 * схлопывается в `min`, как у календаря.
 */
export function inFieldBounds(
	value: TCalendarDate | TCalendarDateTime,
	min: unknown,
	max: unknown,
): boolean {
	const low = parseFieldValue(min)
	const high = parseFieldValue(max)
	const upper =
		low !== undefined && high !== undefined && compareFieldValues(high, low) < 0 ? low : high

	if (low !== undefined && compareFieldValues(value, low) < 0) return false

	return upper === undefined || compareFieldValues(value, upper) <= 0
}

/**
 * Значение по числам частей в точности `granularity`: дата — из года, месяца и
 * дня, дата со временем — ещё из часа (0–23) и минуты. Числа нет или такой
 * даты нет — `undefined`.
 */
export function fieldValueOf(
	numbers: TDateFieldNumbers,
	granularity: TDateGranularity,
): TCalendarDate | TCalendarDateTime | undefined {
	return COMPOSE[granularity](numbers)
}

/**
 * Значение из текста, который вставили в поле, — дата или дата со временем по
 * точности формата; не собрать — `undefined`.
 *
 * Цифры приводятся к ASCII (`digitOf`), метки направления выбрасываются. Дальше
 * — ISO по точности (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm`) или группы цифр в
 * порядке числовых частей формата: разделители между ними любые, год —
 * полностью, в календаре поля (`th-TH` — 2569, то есть 2026), час — в цикле
 * локали. У 12-часового цикла в тексте должно стоять имя ровно одного периода
 * суток (`PM`, регистр не важен). Дата и время должны быть: 31 февраля и 13 PM
 * — не значение.
 */
export function parseFieldText(
	text: string,
	format: IDateFieldFormat,
): TCalendarDate | TCalendarDateTime | undefined {
	const normalized = [...text.replace(DIRECTION_MARKS, '')]
		.map((char) => {
			const digit = digitOf(char, format.digits)

			return digit === undefined ? char : String(digit)
		})
		.join('')
		.trim()

	const iso = ISO[format.granularity](normalized)

	if (iso !== undefined) return iso

	// Период суток — слово, а не цифры: групп столько, сколько числовых частей
	const numeric: readonly TDateFieldPart[] = format.parts.filter((part) => part !== 'dayPeriod')
	const groups = normalized.match(DIGIT_GROUPS) ?? []

	if (groups.length !== numeric.length) return undefined

	const read = (part: TDateFieldPart): number => Number(groups[numeric.indexOf(part)])

	return fieldValueOf(FROM_TEXT[format.granularity](read, normalized, format), format.granularity)
}

/**
 * Час суток по часу из текста: в ходе цикла формата, а у 12-часового цикла — с
 * периодом из того же текста. Не час — `undefined`.
 */
function hourOfText(shown: number, text: string, format: IDateFieldFormat): number | undefined {
	const { min, max } = hourLimits(format.hourCycle)
	const period = format.parts.includes('dayPeriod') ? periodOfText(text, format) : 0

	if (period === undefined || !Number.isInteger(shown) || shown < min || shown > max) {
		return undefined
	}

	return hourOfDay(shown, format.hourCycle, period)
}

/** Период суток по тексту: в нём ровно одно имя периода, регистр не важен. */
function periodOfText(text: string, format: IDateFieldFormat): number | undefined {
	const lower = text.toLocaleLowerCase(format.lang)
	const found = format.dayPeriods.flatMap((name, index) =>
		lower.includes(name.toLocaleLowerCase(format.lang)) ? [index] : [],
	)

	return found.length === 1 ? found[0] : undefined
}

/** Время ли в значении поля: дата со временем, а не дата. */
function hasTime(value: TCalendarDate | TCalendarDateTime): boolean {
	return value.includes(TIME_SEPARATOR)
}

/** День значения поля: у даты со временем — дата до `T`. */
function dayOf(value: TCalendarDate | TCalendarDateTime): TCalendarDate {
	const index = value.indexOf(TIME_SEPARATOR)

	return index === -1 ? value : value.slice(0, index)
}
