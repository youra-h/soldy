import { DEFAULT_LOCALE } from '../../../../common'
import { AS_IS, numberRule, wrap } from '../segments'
import type { TFieldPart, TPartEntry } from '../segments'
import type { TDateFieldToken, TGroupContext, TPartGroup, TPartGroupKind } from '../format'
import type { TDateInputParts, TDatePartLimits } from '../types'
import { HALF_DAY, hasDayPeriod, hourInCycle, hourLimits, hourOfDay } from './hour-cycle'
import type { THourCycle } from './types'

/** Формат частей времени: час и минута — двумя цифрами; цикл часов даёт локаль. */
const OPTIONS: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }

/** Кусок значения — час и минута по две цифры. */
const TIME_FORMAT = /^(\d{2}):(\d{2})$/

/** Ход минуты и периода суток — от локали он не зависит. */
const MINUTES: TDatePartLimits = { min: 0, max: 59 }
const DAY_PERIODS: TDatePartLimits = { min: 0, max: 1 }

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
 * Группа времени — час, минута и, у 12-часового цикла локали, период суток.
 * Кусок значения — `HH:mm`. Числа частей — час суток от 0 до 23 и период: 0 до
 * полудня, 1 после; час, который видит пользователь, — в цикле часов локали.
 *
 * Период суток — выбранная половина суток. У 12-часового цикла его выбирает
 * пользователь, и час, набранный без него, — в половине, которую период ещё
 * не подтвердил. Формат без периода показывает час суток целиком: набранный
 * там час и есть выбор половины.
 */
export const TIME_GROUP: TPartGroupKind = {
	options: OPTIONS,
	parse: (text) => {
		const match = TIME_FORMAT.exec(text)

		if (!match) return undefined

		const hour = Number(match[1])
		const minute = Number(match[2])

		return timeExists(hour, minute)
			? { hour, minute, dayPeriod: Math.floor(hour / HALF_DAY) }
			: undefined
	},
	compose: ({ hour, minute }) =>
		hour === undefined || minute === undefined || !timeExists(hour, minute)
			? undefined
			: `${twoDigits(hour)}:${twoDigits(minute)}`,
	compare: (a, b) => (a === b ? 0 : a < b ? -1 : 1),
	create: createGroup,
}

function createGroup({ resolved, digits }: TGroupContext): TPartGroup {
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
	const minute: TFieldPart = {
		type: 'minute',
		rule: numberRule(2, digits, {
			...AS_IS,
			placeholder: PLACEHOLDER,
			limits: () => MINUTES,
			step: wrap,
		}),
	}
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
	const clock: readonly TDateFieldToken[] = [hour, { type: 'literal', text: ':' }, minute]
	const withPeriod = hasDayPeriod(cycle)

	return {
		parts: withPeriod ? [hour, minute, dayPeriod] : [hour, minute],
		isoTokens: withPeriod ? [...clock, { type: 'literal', text: ' ' }, dayPeriod] : clock,
		fromText: (read, text) => {
			const shown = read('hour')
			const { min, max } = hourLimits(cycle)
			const period = withPeriod ? periodOfText(text, periods, lang) : 0

			if (period === undefined || !Number.isInteger(shown) || shown < min || shown > max) {
				return undefined
			}

			return { hour: hourOfDay(shown, cycle, period), minute: read('minute') }
		},
		now: () => {
			const now = new Date()
			const hours = now.getHours()

			return {
				hour: hours,
				minute: now.getMinutes(),
				dayPeriod: Math.floor(hours / HALF_DAY),
			}
		},
	}
}

/** Час от 0 до 23 и минута от 0 до 59 — целые. */
function timeExists(hour: number, minute: number): boolean {
	return (
		Number.isInteger(hour) &&
		Number.isInteger(minute) &&
		hour >= 0 &&
		hour <= 23 &&
		minute >= 0 &&
		minute <= 59
	)
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
