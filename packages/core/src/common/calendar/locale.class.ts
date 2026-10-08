import { DEFAULT_LOCALE } from '../locale'
import { WEEKDAYS, addDays, utcDateOf } from './date'
import { firstDayOfWeek } from './week'
import { weekdayLabelWidth } from './weekday-label'
import type { ICalendarLocale, TCalendarDate, TWeekday, TWeekdayWidth } from './types'

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

/**
 * Локаль календаря: канонический тег, первый день недели и подписи.
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
	/** Форма подписи колонки дня недели; считается при первом обращении */
	private _labelWidth: 'short' | 'narrow' | undefined

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
	 * Форма — по семи коротким именам недели (`weekdayLabelWidth`), одна на все
	 * дни. Считается при первом обращении и живёт вместе с объектом, как
	 * форматтеры: имена у тега не меняются.
	 */
	weekdayLabel(day: TWeekday): string {
		this._labelWidth ??= weekdayLabelWidth(
			WEEKDAYS.map((weekday) => this.weekdayName(weekday, 'short')),
		)

		return this.weekdayName(day, this._labelWidth)
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
