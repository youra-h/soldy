import { DEFAULT_LOCALE } from '../../../../common'
import { AS_IS, numberRule, wrap } from '../segments'
import type { TFieldPart, TPartEntry } from '../segments'
import type { TDateFieldToken, TGroupContext, TPartGroup, TGroupSpec } from '../format'
import type { TDateInputParts, TDatePartLimits, TTimePrecision } from '../types'
import { HALF_DAY, hasDayPeriod, hourInCycle, hourLimits, hourOfDay } from './hour-cycle'
import type { TClockPart, THourCycle } from './types'

/** Час суток в куске значения — от 0 до 23. */
const HOURS: TDatePartLimits = { min: 0, max: 23 }

/** Ход минуты, секунды и периода суток — от локали он не зависит. */
const SIXTY: TDatePartLimits = { min: 0, max: 59 }
const DAY_PERIODS: TDatePartLimits = { min: 0, max: 1 }

/** Число куска значения — две цифры. */
const TWO_DIGITS = /^\d{2}$/

/** Разделитель чисел в куске значения и в запасном формате: `HH:mm:ss`. */
const COLON = ':'

/** Число части после часа в моменте — с него начинает ↑/↓ пустая часть. */
const NOW: Readonly<Record<TClockPart, (date: Date) => number>> = {
	minute: (date) => date.getMinutes(),
	second: (date) => date.getSeconds(),
}

/**
 * Подсказка пустой части времени — в любом языке одна: у Intl подсказок частей
 * нет, а у времени и в браузерах вместо букв черта.
 */
const PLACEHOLDER = '––'

/** Имена периодов суток — в 12-часовом цикле, каким бы ни был цикл локали. */
const DAY_PERIOD: Intl.DateTimeFormatOptions = {
	hour: 'numeric',
	hourCycle: 'h12',
	timeZone: 'UTC',
}

/** Час в мс — шаг к часам, по которым видны имена периодов суток. */
const HOUR_MS = 3_600_000

/** Часы, по которым видны имена периодов суток: 2 часа ночи и 2 часа дня. */
const DAY_PERIOD_HOURS: readonly [number, number] = [2, 14]

/**
 * Имена периодов суток, если Intl их не отдал: у известных движков такой
 * локали нет, а своих строк у библиотеки нет — имена берутся английские.
 */
const DAY_PERIOD_FALLBACK: readonly [string, string] = ['AM', 'PM']

/**
 * Группы времени по точности — спецификации одной фабрики. Точность — это
 * части после часа: до минуты — минута, кусок значения `HH:mm`; до секунды —
 * ещё секунда, `HH:mm:ss`. По ним у спецификации свои опции Intl, кусок
 * значения, части и запасной формат.
 */
export const TIME_GROUPS: Readonly<Record<TTimePrecision, TGroupSpec>> = {
	minute: timeGroup(['minute']),
	second: timeGroup(['minute', 'second']),
}

/**
 * Группа времени — час, части после часа (`clock`: минута и, до секунды,
 * секунда) и, у 12-часового цикла локали, период суток. Кусок значения — час
 * и части после часа по две цифры через двоеточие. Числа частей — час суток от
 * 0 до 23, минута и секунда от 0 до 59 и период: 0 до полудня, 1 после; час,
 * который видит пользователь, — в цикле часов локали.
 *
 * Период суток — выбранная половина суток. У 12-часового цикла его выбирает
 * пользователь, и час, набранный без него, — в половине, которую период ещё
 * не подтвердил. Формат без периода показывает час суток целиком: набранный
 * там час и есть выбор половины.
 *
 * Общее у спецификаций разной точности — только сравнение кусков
 * (`compareTimes`): значения разной точности сравниваются кусок за куском
 * спецификацией любого из двух, и правило у них обязано быть одно.
 */
function timeGroup(clock: readonly TClockPart[]): TGroupSpec {
	return {
		options: optionsOf(clock),
		parse: (text) => parseTime(text, clock),
		compose: (parts) => composeTime(parts, clock),
		compare: compareTimes,
		create: (context) => createGroup(context, clock),
	}
}

function createGroup(
	{ resolved, digits }: TGroupContext,
	clock: readonly TClockPart[],
): TPartGroup {
	const cycle: THourCycle = resolved.hourCycle ?? 'h23'
	const lang = resolved.locale
	const periods = dayPeriodsOf(lang)

	const hour: TFieldPart = {
		type: 'hour',
		rule: numberRule(2, digits, {
			placeholder: PLACEHOLDER,
			limits: () => hourLimits(cycle),
			shown: (value) => hourInCycle(value, cycle),
			stored: (shown, parts) => hourOfDay(shown, cycle, halfOf(parts)),
			step: wrap,
			settle: (parts) => periodOfHour(parts, cycle),
		}),
	}
	// Минута и секунда — одно правило: ход 0–59 по кругу, соседей не трогают
	const afterHour = clock.map(
		(type): TFieldPart => ({
			type,
			rule: numberRule(2, digits, {
				...AS_IS,
				placeholder: PLACEHOLDER,
				limits: () => SIXTY,
				step: wrap,
			}),
		}),
	)
	const dayPeriod: TFieldPart = {
		type: 'dayPeriod',
		rule: {
			...AS_IS,
			placeholder: PLACEHOLDER,
			numeric: false,
			limits: () => DAY_PERIODS,
			step: wrap,
			text: (shown) => periods[shown] ?? '',
			enter: (_parts, _typed, key) => enterPeriod(key, periods, lang),
			erase: () => ({ shown: undefined, typed: '' }),
			settle: hourOfPeriod,
		},
	}
	const isoClock: readonly TDateFieldToken[] = [
		hour,
		...afterHour.flatMap((part): TDateFieldToken[] => [{ type: 'literal', text: COLON }, part]),
	]
	const withPeriod = hasDayPeriod(cycle)

	return {
		parts: withPeriod ? [hour, ...afterHour, dayPeriod] : [hour, ...afterHour],
		isoTokens: withPeriod ? [...isoClock, { type: 'literal', text: ' ' }, dayPeriod] : isoClock,
		fromText: (read, text) => {
			const shown = read('hour')
			const { min, max } = hourLimits(cycle)
			const period = withPeriod ? periodOfText(text, periods, lang) : 0

			if (period === undefined || !Number.isInteger(shown) || shown < min || shown > max) {
				return undefined
			}

			return { hour: hourOfDay(shown, cycle, period), ...clockParts(clock, read) }
		},
		now: () => {
			const now = new Date()
			const hours = now.getHours()

			return {
				hour: hours,
				...clockParts(clock, (type) => NOW[type](now)),
				dayPeriod: Math.floor(hours / HALF_DAY),
			}
		},
	}
}

/** Опции Intl: час и части после часа — двумя цифрами; цикл часов даёт локаль. */
function optionsOf(clock: readonly TClockPart[]): Intl.DateTimeFormatOptions {
	const options: Intl.DateTimeFormatOptions = { hour: '2-digit' }

	for (const type of clock) options[type] = '2-digit'

	return options
}

/**
 * Числа частей из куска значения — часа и частей после часа, ровно столько,
 * сколько их у точности: `HH:mm` у точности до секунды — не кусок. Не кусок
 * или такого времени нет — `undefined`.
 */
function parseTime(text: string, clock: readonly TClockPart[]): TDateInputParts | undefined {
	const fields = text.split(COLON)

	if (fields.length !== clock.length + 1 || !fields.every((field) => TWO_DIGITS.test(field))) {
		return undefined
	}

	const [hour, ...rest] = fields.map(Number)

	if (!timeExists(hour, rest)) return undefined

	return {
		hour,
		...clockParts(clock, (_type, index) => rest[index]),
		dayPeriod: Math.floor(hour / HALF_DAY),
	}
}

/** Кусок значения по числам частей; числа нет или такого времени нет — `undefined`. */
function composeTime(parts: TDateInputParts, clock: readonly TClockPart[]): string | undefined {
	const numbers = [parts.hour, ...clock.map((type) => parts[type])]

	if (!numbers.every((value): value is number => value !== undefined)) return undefined

	const [hour, ...rest] = numbers

	return timeExists(hour, rest) ? numbers.map(twoDigits).join(COLON) : undefined
}

/**
 * Порядок двух кусков времени — с точностью грубейшего: `HH:mm` и `HH:mm:ss`
 * сравниваются до минуты, два куска с секундами — до секунды. Каждое число
 * куска — две цифры, поэтому общее начало строк и есть общая точность, а
 * порядок строк одной длины — порядок моментов.
 */
function compareTimes(a: string, b: string): number {
	const length = Math.min(a.length, b.length)
	const left = a.slice(0, length)
	const right = b.slice(0, length)

	return left === right ? 0 : left < right ? -1 : 1
}

/**
 * Числа частей после часа по типу: `valueOf` — число части по её типу и месту
 * за часом (минута — 0, секунда — 1).
 */
function clockParts(
	clock: readonly TClockPart[],
	valueOf: (type: TClockPart, index: number) => number,
): TDateInputParts {
	return Object.fromEntries(
		clock.map((type, index): [TClockPart, number] => [type, valueOf(type, index)]),
	)
}

/** Такое время есть: час от 0 до 23, минута и секунда от 0 до 59 — целые. */
function timeExists(hour: number, rest: readonly number[]): boolean {
	return inLimits(hour, HOURS) && rest.every((value) => inLimits(value, SIXTY))
}

/** Целое в ходе части. */
function inLimits(value: number, { min, max }: TDatePartLimits): boolean {
	return Number.isInteger(value) && value >= min && value <= max
}

function twoDigits(value: number): string {
	return String(value).padStart(2, '0')
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
function periodOfHour(parts: TDateInputParts, cycle: THourCycle): TDateInputParts {
	if (hasDayPeriod(cycle)) return parts

	const { hour } = parts

	return { ...parts, dayPeriod: hour === undefined ? undefined : Math.floor(hour / HALF_DAY) }
}

/** Выбрали период — набранный час за ним, в его половину суток. */
function hourOfPeriod(parts: TDateInputParts): TDateInputParts {
	const { hour, dayPeriod } = parts

	if (hour === undefined || dayPeriod === undefined) return parts

	return { ...parts, hour: (hour % HALF_DAY) + dayPeriod * HALF_DAY }
}

/**
 * Буква в период суток: имя периода начинается с неё, регистр не важен. Не
 * начинается ни одно — знак не периода. Начинаются оба (`ko-KR` — «오전» и
 * «오후») — период не меняется. Выбрали — дописывать нечего, фокус дальше.
 */
function enterPeriod(
	key: string,
	periods: readonly [string, string],
	lang: string,
): TPartEntry | undefined {
	if (key === '') return undefined

	const letter = key.toLocaleLowerCase(lang)
	const found = periods.flatMap((name, index) =>
		name.toLocaleLowerCase(lang).startsWith(letter) ? [index] : [],
	)

	if (found.length === 0) return undefined
	if (found.length > 1) return { shown: undefined, typed: '', advance: false }

	return { shown: found[0], typed: '', advance: true }
}

/** Период суток по тексту: в нём ровно одно имя периода, регистр не важен. */
function periodOfText(
	text: string,
	periods: readonly [string, string],
	lang: string,
): number | undefined {
	const lower = text.toLocaleLowerCase(lang)
	const found = periods.flatMap((name, index) =>
		lower.includes(name.toLocaleLowerCase(lang)) ? [index] : [],
	)

	return found.length === 1 ? found[0] : undefined
}

/** Имена периодов суток — до полудня и после, как их пишет 12-часовой цикл локали. */
function dayPeriodsOf(lang: string): readonly [string, string] {
	const formatter = new Intl.DateTimeFormat([lang, DEFAULT_LOCALE], DAY_PERIOD)
	const name = (index: 0 | 1): string =>
		formatter
			.formatToParts(DAY_PERIOD_HOURS[index] * HOUR_MS)
			.find((part) => part.type === 'dayPeriod')?.value ?? DAY_PERIOD_FALLBACK[index]

	return [name(0), name(1)]
}
