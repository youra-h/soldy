import { addDays, utcDateOf } from './date'
import { DATE_PARTS, digitOf, isDatePart } from './field'
import { DATE_PART_PLACEHOLDERS } from './placeholders'
import { firstDayOfWeek } from './week'
import type {
	ICalendarLocale,
	IDateFieldFormat,
	TCalendarDate,
	TDateFieldToken,
	TDatePart,
	TWeekday,
	TWeekdayWidth,
} from './types'

/**
 * Локаль по умолчанию. Язык интерфейса ядру неизвестен, а дефолт английский
 * (AGENTS.md, «Языка интерфейса библиотека не знает»): так сервер и браузер
 * без заданной локали рисуют одно и то же.
 */
export const DEFAULT_LOCALE = 'en-US'

/**
 * Календари с григорианскими месяцами: у них другие только годы и эры, и
 * подписи ложатся на сетку как есть.
 */
const GREGORIAN_MONTHS: readonly string[] = ['gregory', 'buddhist', 'japanese', 'roc']

/** Воскресенье — от него `weekdayName` отсчитывает дни недели. */
const SUNDAY: TCalendarDate = '1970-01-04'

const TITLE: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }
const MONTH: Intl.DateTimeFormatOptions = { month: 'short' }
const YEAR: Intl.DateTimeFormatOptions = { year: 'numeric' }
const DAY: Intl.DateTimeFormatOptions = { day: 'numeric' }
const FULL: Intl.DateTimeFormatOptions = { dateStyle: 'full' }

/** Формат поля даты: день и месяц — двумя цифрами, год — полностью. */
const FIELD: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }

/**
 * Опорная дата формата поля. По ней видно направление ряда и сдвиг года
 * календаря поля: число дня не совпадает с номером месяца, и части не спутать.
 */
const FIELD_SAMPLE: TCalendarDate = '2026-05-12'
const FIELD_SAMPLE_YEAR = 2026

/**
 * Запасной формат поля — ISO: части по порядку `YYYY-MM-DD`. Нужен, только
 * если Intl отдал не ровно по одной части каждого типа; у известных движков
 * такой локали нет.
 */
const ISO_TOKENS: readonly TDateFieldToken[] = [
	{ type: 'year' },
	{ type: 'literal', text: '-' },
	{ type: 'month' },
	{ type: 'literal', text: '-' },
	{ type: 'day' },
]

/** Цифры от нуля до девяти — то, что форматирует система счисления. */
const DIGITS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

/** Метки направления — сильные знаки сами по себе. */
const RLM = '‏'
const ALM = '؜'
const LRM = '‎'

/**
 * Слабые цифры: европейские (ASCII и полноширинные) и арабские обоих видов —
 * направления они не задают. Цифры остальных систем сильные, как буквы своей
 * письменности.
 */
const WEAK_DIGIT = /[0-9٠-٩۰-۹０-９]/

/** Буква или цифра — знак, который может быть сильным. */
const ALPHANUMERIC = /[\p{L}\p{N}]/u

/** Письменности справа налево: их буквы и сильные цифры (`nkoo`, `adlm`). */
const RTL_SCRIPT =
	/[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}]/u

/**
 * Локаль календаря: канонический тег, первый день недели, подписи и формат
 * поля даты.
 *
 * Форматтеры создаются при первом обращении, а не при загрузке модуля, и
 * живут вместе с объектом — а он один на тег (`calendarLocale`). Каждый
 * форматирует в `UTC` полночь даты (`utcDateOf`): день — ровно дата, без
 * сдвига часовым поясом среды.
 *
 * Локаль у форматтеров — списком `[тег, 'en-US']`: неподдержанный движком тег
 * уходит в английский, а не в язык среды. Иначе сервер и браузер с разными
 * языками по умолчанию подписали бы один календарь по-разному.
 */
export class TCalendarLocale implements ICalendarLocale {
	readonly locale: string
	readonly firstDay: TWeekday
	readonly calendar: string
	private readonly _formatters = new Map<string, Intl.DateTimeFormat>()
	private _dateField: IDateFieldFormat | undefined = undefined

	/** @param tag тег локали; невалидный и пустой — `en-US` */
	constructor(tag: string | undefined) {
		this.locale = canonicalTag(tag)
		this.firstDay = firstDayOfWeek(this.locale)
		this.calendar = labelCalendar(this.locale)
	}

	monthTitle(date: TCalendarDate): string {
		return this._formatter('title', TITLE).format(utcDateOf(date))
	}

	/** Месяц без числа и года Intl пишет самостоятельной формой сам. */
	monthName(date: TCalendarDate): string {
		return this._formatter('month', MONTH).format(utcDateOf(date))
	}

	yearTitle(date: TCalendarDate): string {
		return this._formatter('year', YEAR).format(utcDateOf(date))
	}

	/**
	 * Отрезок — `formatRange`, а не два года через тире: разделитель и
	 * повтор эры у каждой локали свои (`2017–2028`, `2017年～2028年`).
	 */
	yearsTitle(from: TCalendarDate, to: TCalendarDate): string {
		return this._formatter('year', YEAR).formatRange(utcDateOf(from), utcDateOf(to))
	}

	/**
	 * Номер — часть `day`, а не вся строка форматтера: у `ja-JP` строка дня —
	 * «26日».
	 */
	dayNumber(date: TCalendarDate): string {
		const parts = this._formatter('day', DAY).formatToParts(utcDateOf(date))

		return parts.find((part) => part.type === 'day')?.value ?? ''
	}

	fullDate(date: TCalendarDate): string {
		return this._formatter('full', FULL).format(utcDateOf(date))
	}

	weekdayName(day: TWeekday, width: TWeekdayWidth): string {
		return this._formatter(width, { weekday: width }).format(utcDateOf(addDays(SUNDAY, day)))
	}

	/**
	 * Формат поля даты. Календарь у него свой: буддийский, если буддийский
	 * календарь подписей, иначе григорианский, — эры у поля нет, а японская эра
	 * меняется посреди года.
	 */
	get dateField(): IDateFieldFormat {
		this._dateField ??= this._createDateField()

		return this._dateField
	}

	private _createDateField(): IDateFieldFormat {
		const formatter = new Intl.DateTimeFormat([this.locale, DEFAULT_LOCALE], {
			...FIELD,
			calendar: this.calendar === 'buddhist' ? 'buddhist' : 'gregory',
			timeZone: 'UTC',
		})
		const { locale, numberingSystem } = formatter.resolvedOptions()
		const sample = formatter.formatToParts(utcDateOf(FIELD_SAMPLE))
		const digits = digitsOf(numberingSystem)
		const tokens = tokensOf(sample)
		const year = numberOf(sample.find((part) => part.type === 'year')?.value ?? '', digits)

		return {
			tokens,
			parts: tokens.flatMap((token) => (token.type === 'literal' ? [] : [token.type])),
			direction: directionOf(sample.map((part) => part.value).join('')),
			lang: locale,
			yearOffset: Number.isNaN(year) ? 0 : year - FIELD_SAMPLE_YEAR,
			digits,
			placeholders: placeholdersOf(locale),
			names: namesOf(this.locale),
		}
	}

	private _formatter(key: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
		let formatter = this._formatters.get(key)

		if (formatter === undefined) {
			formatter = new Intl.DateTimeFormat([this.locale, DEFAULT_LOCALE], {
				...options,
				calendar: this.calendar,
				timeZone: 'UTC',
			})
			this._formatters.set(key, formatter)
		}

		return formatter
	}
}

/** Канонический тег; невалидный и пустой — локаль по умолчанию, а не исключение. */
function canonicalTag(tag: string | undefined): string {
	if (!tag) return DEFAULT_LOCALE

	try {
		return Intl.getCanonicalLocales(tag)[0]
	} catch {
		return DEFAULT_LOCALE
	}
}

/**
 * Календарь подписей: календарь локали, если месяцы у него григорианские
 * (`th-TH` — буддийский год 2569), иначе `gregory`. Месяцы `persian`,
 * `islamic-*` и `hebrew` не совпадают с сеткой, а своей арифметики этих
 * календарей у ядра нет: заголовок ушёл бы в чужой месяц мимо дней под ним.
 */
function labelCalendar(locale: string): string {
	const { calendar } = new Intl.DateTimeFormat([locale, DEFAULT_LOCALE]).resolvedOptions()

	return GREGORIAN_MONTHS.includes(calendar) ? calendar : 'gregory'
}

/**
 * Части и литералы формата поля. Соседние литералы склеиваются, всё, что не
 * день, месяц и год, — тоже литерал. Не ровно по одной части каждого типа —
 * формат ISO.
 */
function tokensOf(sample: readonly Intl.DateTimeFormatPart[]): readonly TDateFieldToken[] {
	const tokens: TDateFieldToken[] = []
	const seen = new Set<TDatePart>()

	for (const { type, value } of sample) {
		const last = tokens[tokens.length - 1]

		if (isDatePart(type) && !seen.has(type)) {
			seen.add(type)
			tokens.push({ type })
		} else if (last?.type === 'literal') {
			tokens[tokens.length - 1] = { type: 'literal', text: last.text + value }
		} else {
			tokens.push({ type: 'literal', text: value })
		}
	}

	return seen.size === DATE_PARTS.length ? tokens : ISO_TOKENS
}

/**
 * Цифры системы счисления — по знаку на цифру. Система, которая цифру одним
 * знаком не пишет, — цифры ASCII: такую Intl для чисел даты не выбирает.
 */
function digitsOf(numberingSystem: string): readonly string[] {
	try {
		const format = new Intl.NumberFormat(DEFAULT_LOCALE, {
			numberingSystem,
			useGrouping: false,
		})
		const digits = DIGITS.map((digit) => format.format(digit))

		if (digits.every((digit) => [...digit].length === 1)) return digits
	} catch {
		// Неизвестная система — цифры ASCII ниже
	}

	return DIGITS.map(String)
}

/** Число из цифр локали; знак не цифра — `NaN`. */
function numberOf(text: string, digits: readonly string[]): number {
	const values = [...text].map((char) => digitOf(char, digits))

	if (values.length === 0 || values.some((value) => value === undefined)) return Number.NaN

	return Number(values.join(''))
}

/**
 * Направление по первому сильному знаку текста: буква или сильная цифра
 * письменности справа налево и метки RLM и ALM — справа налево, остальные
 * буквы, сильные цифры и метка LRM — слева направо. Европейские и арабские
 * цифры, знаки и пробелы — слабые. Сильного знака нет — слева направо.
 */
function directionOf(text: string): 'ltr' | 'rtl' {
	for (const char of text) {
		if (char === RLM || char === ALM) return 'rtl'
		if (char === LRM) return 'ltr'
		if (WEAK_DIGIT.test(char) || !ALPHANUMERIC.test(char)) continue

		return RTL_SCRIPT.test(char) ? 'rtl' : 'ltr'
	}

	return 'ltr'
}

/**
 * Подсказки пустых частей по языку локали форматтера: тег целиком, язык с
 * письменностью (`sr-Latn`), язык с регионом (`zh-TW`), язык; затем другой
 * регион того же языка (`zh-HK` — `zh-CN`). Языка в таблице нет — английские.
 */
function placeholdersOf(locale: string): Readonly<Record<TDatePart, string>> {
	const { language, script, region } = new Intl.Locale(locale)
	const tags = [
		locale,
		script ? `${language}-${script}` : '',
		region ? `${language}-${region}` : '',
		language,
		Object.keys(DATE_PART_PLACEHOLDERS).find((tag) => tag.startsWith(`${language}-`)) ?? '',
	]

	for (const tag of tags) {
		const placeholders = DATE_PART_PLACEHOLDERS[tag]

		if (tag && placeholders) return placeholders
	}

	return DATE_PART_PLACEHOLDERS.en
}

/**
 * Имена частей для скринридера — `Intl.DisplayNames` с типом
 * `dateTimeField`, локали списком `[тег, 'en-US']`, как у подписей. Движок без
 * таких имён — имена типов частей: своих строк у библиотеки нет.
 */
function namesOf(locale: string): Readonly<Record<TDatePart, string>> {
	try {
		const names = new Intl.DisplayNames([locale, DEFAULT_LOCALE], { type: 'dateTimeField' })

		return {
			day: names.of('day') ?? 'day',
			month: names.of('month') ?? 'month',
			year: names.of('year') ?? 'year',
		}
	} catch {
		return { day: 'day', month: 'month', year: 'year' }
	}
}
