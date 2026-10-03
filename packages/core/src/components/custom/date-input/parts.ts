import {
	FIELD_PARTS,
	daysInMonth,
	digitOf,
	fieldValueOf,
	formatFieldNumber,
	hasDayPeriod,
	hourInCycle,
	hourLimits,
	hourOfDay,
	parseDate,
	parseDateTime,
} from '../../../common'
import type { IDateFieldFormat, TCalendarDate, TDateFieldPart } from '../../../common'
import type {
	TDateInputParts,
	TDateInputValue,
	TDatePartLimits,
	TDigitErase,
	TKeyEntry,
} from './types'

/**
 * Правила частей поля даты — чистые функции над числами частей.
 *
 * Числа частей хранятся без локали (`TDateInputParts`): год григорианский, час
 * — от 0 до 23, период суток — 0 или 1. Ход, набор и текст — в числах, которые
 * видит пользователь: год — в календаре поля (буддийский у `th-TH` больше
 * григорианского на `yearOffset`), час — в цикле часов локали (1–12 у `h12`).
 * Чем части различаются, задаёт правило части (`RULES`), а не ветки по типу.
 *
 * Период суток — выбранная половина суток. У 12-часового цикла его выбирает
 * пользователь, и час, набранный без него, — в половине, которую период ещё
 * не подтвердил. Формат без периода показывает час суток целиком: набранный
 * там час и есть выбор половины.
 */

/** Високосный год: месяц без года не короче своей наибольшей длины — февраль 29 дней. */
const LEAP_YEAR = 2000

/** Ход месяца, минуты и периода суток — от локали он не зависит. */
const MONTHS: TDatePartLimits = { min: 1, max: 12 }
const MINUTES: TDatePartLimits = { min: 0, max: 59 }
const DAY_PERIODS: TDatePartLimits = { min: 0, max: 1 }

/** Часов в половине суток: период переносит час на столько. */
const HALF_DAY = 12

/** Правило части — всё, чем части различаются. */
type TPartRule = {
	/** Ход части в числах, которые видит пользователь */
	limits(parts: TDateInputParts, format: IDateFieldFormat): TDatePartLimits
	/** Число, которое видит пользователь, по хранимому */
	shown(value: number, format: IDateFieldFormat): number
	/** Хранимое число по тому, что видит пользователь */
	stored(shown: number, parts: TDateInputParts, format: IDateFieldFormat): number
	/** Шаг ↑/↓: по кругу хода или до его края */
	step(value: number, min: number, max: number): number
	/** Текст набранной части */
	text(shown: number, format: IDateFieldFormat): string
	/** Знак в часть; знак не этой части — `undefined` */
	enter(
		parts: TDateInputParts,
		typed: string,
		part: TDateFieldPart,
		key: string,
		format: IDateFieldFormat,
	): TKeyEntry | undefined
	/** Backspace по набранной части */
	erase(parts: TDateInputParts, part: TDateFieldPart, format: IDateFieldFormat): TDigitErase
	/** Части после записи этой части — согласованные с ней соседи */
	settle(parts: TDateInputParts, format: IDateFieldFormat): TDateInputParts
}

/** Число — то, что видит пользователь, — оно же хранится. */
const AS_IS: Pick<TPartRule, 'shown' | 'stored' | 'settle'> = {
	shown: (value) => value,
	stored: (shown) => shown,
	settle: (parts) => parts,
}

/** Правило числовой части: текст — число цифрами локали, ввод — цифрами. */
function numberRule(
	width: number,
	rule: Pick<TPartRule, 'limits' | 'shown' | 'stored' | 'step' | 'settle'>,
): TPartRule {
	return {
		...rule,
		text: (shown, format) => formatFieldNumber(shown, width, format.digits),
		enter: (parts, typed, part, key, format) => {
			const digit = digitOf(key, format.digits)

			return digit === undefined ? undefined : enterDigit(parts, typed, part, digit, format)
		},
		erase: (parts, part, format) => eraseDigit(parts, part, width, format),
	}
}

/**
 * Правила частей. День и месяц — две цифры по кругу; год — в календаре поля,
 * до края хода; час — в цикле локали, по кругу в своей половине суток, как у
 * нативного поля; минута — по кругу; период суток — имя локали, буква и ↑/↓.
 */
const RULES: Readonly<Record<TDateFieldPart, TPartRule>> = {
	day: numberRule(2, {
		...AS_IS,
		limits: (parts) => ({ min: 1, max: dayMax(parts) }),
		step: wrap,
	}),
	month: numberRule(2, { ...AS_IS, limits: () => MONTHS, step: wrap }),
	year: numberRule(1, {
		...AS_IS,
		limits: (_, format) => ({ min: 1 + format.yearOffset, max: 9999 + format.yearOffset }),
		shown: (value, format) => value + format.yearOffset,
		stored: (shown, _, format) => shown - format.yearOffset,
		step: clamp,
	}),
	hour: numberRule(2, {
		limits: (_, format) => hourLimits(format.hourCycle),
		shown: (value, format) => hourInCycle(value, format.hourCycle),
		stored: (shown, parts, format) => hourOfDay(shown, format.hourCycle, halfOf(parts)),
		step: wrap,
		settle: periodOfHour,
	}),
	minute: numberRule(2, { ...AS_IS, limits: () => MINUTES, step: wrap }),
	dayPeriod: {
		...AS_IS,
		limits: () => DAY_PERIODS,
		step: wrap,
		text: (shown, format) => format.dayPeriods[shown] ?? '',
		enter: enterPeriod,
		erase: (parts, part, format) => ({
			parts: withPart(parts, part, undefined, format),
			typed: '',
		}),
		settle: hourOfPeriod,
	},
}

/** Части значения — даты или даты со временем; не значение — пусто. */
export function partsOf(value: unknown): TDateInputParts {
	const date = parseDate(value)

	if (date !== undefined) return datePartsOf(date)

	const dateTime = parseDateTime(value)

	if (dateTime === undefined) return {}

	// Формат проверен: `YYYY-MM-DDTHH:mm`
	const hour = Number(dateTime.slice(11, 13))

	return {
		...datePartsOf(dateTime.slice(0, 10)),
		hour,
		minute: Number(dateTime.slice(14, 16)),
		dayPeriod: Math.floor(hour / HALF_DAY),
	}
}

/**
 * Значение из частей — только когда есть все части формата и такое значение
 * есть: дата в точности до дня, дата со временем — до минуты.
 */
export function valueOfParts(parts: TDateInputParts, format: IDateFieldFormat): TDateInputValue {
	if (format.parts.some((part) => parts[part] === undefined)) return undefined

	return fieldValueOf(parts, format.granularity)
}

/** Одинаковы ли части — все, и те, которых нет в формате. */
export function sameParts(a: TDateInputParts, b: TDateInputParts): boolean {
	return FIELD_PARTS.every((part) => a[part] === b[part])
}

/** Пусты ли все части формата. */
export function emptyParts(parts: TDateInputParts, format: IDateFieldFormat): boolean {
	return format.parts.every((part) => parts[part] === undefined)
}

/**
 * Части с новым числом части (`undefined` — очистить) в формате `format`.
 * Соседи — за ней: смена месяца или года прижимает день к длине месяца (31-е в
 * апреле — 30-е), период суток переносит час в свою половину, а час в формате
 * без периода выбирает период.
 */
export function withPart(
	parts: TDateInputParts,
	part: TDateFieldPart,
	value: number | undefined,
	format: IDateFieldFormat,
): TDateInputParts {
	const next = RULES[part].settle({ ...parts, [part]: value }, format)
	const { day } = next

	return day !== undefined && day > dayMax(next) ? { ...next, day: dayMax(next) } : next
}

/** Части без частей `cleared`. */
export function withoutParts(
	parts: TDateInputParts,
	cleared: readonly TDateFieldPart[],
	format: IDateFieldFormat,
): TDateInputParts {
	return cleared.reduce((next, part) => withPart(next, part, undefined, format), parts)
}

/** Ход части в числах, которые видит пользователь. */
export function limitsOf(
	part: TDateFieldPart,
	parts: TDateInputParts,
	format: IDateFieldFormat,
): TDatePartLimits {
	return RULES[part].limits(parts, format)
}

/**
 * Число части, которое видит пользователь: год — в календаре поля, час — в
 * цикле часов. Пустая — `undefined`.
 */
export function shownOf(
	part: TDateFieldPart,
	parts: TDateInputParts,
	format: IDateFieldFormat,
): number | undefined {
	const value = parts[part]

	return value === undefined ? undefined : RULES[part].shown(value, format)
}

/** Число части для хранения — из числа, которое видит пользователь. */
export function storedOf(
	part: TDateFieldPart,
	shown: number,
	parts: TDateInputParts,
	format: IDateFieldFormat,
): number {
	return RULES[part].stored(shown, parts, format)
}

/** Текст части: число цифрами локали, имя периода суток, у пустой — подсказка. */
export function textOf(
	part: TDateFieldPart,
	parts: TDateInputParts,
	format: IDateFieldFormat,
): string {
	const shown = shownOf(part, parts, format)

	return shown === undefined ? format.placeholders[part] : RULES[part].text(shown, format)
}

/**
 * Знак в часть: цифра — в число, буква — в период суток. Знак не этой части —
 * `undefined`.
 */
export function enterKey(
	parts: TDateInputParts,
	typed: string,
	part: TDateFieldPart,
	key: string,
	format: IDateFieldFormat,
): TKeyEntry | undefined {
	return RULES[part].enter(parts, typed, part, key, format)
}

/**
 * Backspace в части: у числа — последняя цифра («12» — 1, «05» — пусто), и
 * дальше набор дописывает к тому, что осталось; период суток стирается
 * целиком. Пустой части стирать нечего — `undefined`.
 */
export function erasePart(
	parts: TDateInputParts,
	part: TDateFieldPart,
	format: IDateFieldFormat,
): TDigitErase | undefined {
	if (parts[part] === undefined) return undefined

	return RULES[part].erase(parts, part, format)
}

/**
 * Шаг ↑/↓ части на `count`: по кругу хода, год — до края. Пустая часть шаг не
 * делает, а начинает с числа текущего момента `now`.
 */
export function stepPart(
	parts: TDateInputParts,
	part: TDateFieldPart,
	count: number,
	format: IDateFieldFormat,
	now: TDateInputParts,
): TDateInputParts {
	const rule = RULES[part]
	const { min, max } = rule.limits(parts, format)
	const shown = shownOf(part, parts, format)
	const next =
		shown === undefined
			? clamp(shownOf(part, now, format) ?? min, min, max)
			: rule.step(shown + Math.round(count), min, max)

	return withPart(parts, part, rule.stored(next, parts, format), format)
}

/**
 * Цифра в числовую часть. Цифры копятся, пока число в ходе части, иначе часть
 * начинается с новой цифры. Ноль первой цифрой значения не даёт, если ноля нет
 * в ходе части: из «0» и «5» выйдет 5, а минута и час `h23` с нуля начинаются.
 * Дописать больше некуда — следующая цифра вывела бы за ход или цифр уже
 * столько, сколько у края хода, — набранное сбрасывается, и фокус уходит на
 * следующую часть.
 */
function enterDigit(
	parts: TDateInputParts,
	typed: string,
	part: TDateFieldPart,
	digit: number,
	format: IDateFieldFormat,
): TKeyEntry {
	const entered = `${typed}${digit}`
	const { min, max } = limitsOf(part, parts, format)
	const number = Number(entered)
	const value = number > max ? digit : number
	const settable = value !== 0 || min === 0
	const full = Number(`${number}0`) > max || entered.length >= String(max).length

	return {
		parts: settable
			? withPart(parts, part, storedOf(part, value, parts, format), format)
			: parts,
		typed: full ? '' : entered,
		advance: full && settable,
	}
}

/** Стереть последнюю цифру числа части; осталось ноль — часть пустеет. */
function eraseDigit(
	parts: TDateInputParts,
	part: TDateFieldPart,
	width: number,
	format: IDateFieldFormat,
): TDigitErase {
	const rest = String(shownOf(part, parts, format) ?? '')
		.padStart(width, '0')
		.slice(0, -1)
	const number = Number(rest)

	if (!Number.isFinite(number) || number === 0) {
		return { parts: withPart(parts, part, undefined, format), typed: '' }
	}

	return {
		parts: withPart(parts, part, storedOf(part, number, parts, format), format),
		typed: rest,
	}
}

/**
 * Буква в период суток: имя периода начинается с неё, регистр не важен. Не
 * начинается ни одно — знак не периода. Начинаются оба (`ko-KR` — «오전» и
 * «오후») — период не меняется. Выбрали — дописывать нечего, фокус дальше.
 */
function enterPeriod(
	parts: TDateInputParts,
	_typed: string,
	part: TDateFieldPart,
	key: string,
	format: IDateFieldFormat,
): TKeyEntry | undefined {
	if (key === '') return undefined

	const letter = key.toLocaleLowerCase(format.lang)
	const periods = format.dayPeriods.flatMap((name, index) =>
		name.toLocaleLowerCase(format.lang).startsWith(letter) ? [index] : [],
	)

	if (periods.length === 0) return undefined
	if (periods.length > 1) return { parts, typed: '', advance: false }

	return { parts: withPart(parts, part, periods[0], format), typed: '', advance: true }
}

/**
 * Половина суток для часа: выбранный период, без него — половина набранного
 * часа, без часа — до полудня.
 */
function halfOf({ hour, dayPeriod }: TDateInputParts): number {
	return dayPeriod ?? (hour === undefined ? 0 : Math.floor(hour / HALF_DAY))
}

/**
 * Записали час. С периодом в формате половину держит выбранный период — час
 * пишется в неё сам (`stored`), а невыбранный остаётся невыбранным. Формат без
 * периода показывает час суток целиком: его половина и есть период, а нет часа
 * — нет и выбранной половины.
 */
function periodOfHour(parts: TDateInputParts, format: IDateFieldFormat): TDateInputParts {
	if (hasDayPeriod(format.hourCycle)) return parts

	const { hour } = parts

	return { ...parts, dayPeriod: hour === undefined ? undefined : Math.floor(hour / HALF_DAY) }
}

/** Выбрали период — набранный час за ним, в его половину суток. */
function hourOfPeriod(parts: TDateInputParts): TDateInputParts {
	const { hour, dayPeriod } = parts

	if (hour === undefined || dayPeriod === undefined) return parts

	return { ...parts, hour: (hour % HALF_DAY) + dayPeriod * HALF_DAY }
}

/** Части даты по проверенной дате `YYYY-MM-DD`. */
function datePartsOf(date: TCalendarDate): TDateInputParts {
	return {
		year: Number(date.slice(0, -6)),
		month: Number(date.slice(-5, -3)),
		day: Number(date.slice(-2)),
	}
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
