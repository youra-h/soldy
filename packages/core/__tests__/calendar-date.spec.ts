import { afterEach, describe, expect, it, vi } from 'vitest'
import {
	FIRST_DATE,
	LAST_DATE,
	addDays,
	addMonths,
	addYears,
	calendarLocale,
	clampDate,
	compareDates,
	dateIfExists,
	dayOfWeek,
	daysInMonth,
	endOfWeek,
	monthGrid,
	monthsBetween,
	orderDates,
	parseDate,
	shiftDate,
	startOfMonth,
	startOfWeek,
	todayDate,
	yearOf,
} from '../src/common/calendar'
import type { TCalendarDate, TWeekday } from '../src/common/calendar'

/**
 * Расчёт дат календаря — `common/calendar`: разбор, сдвиги, недели, сетка
 * месяца, «сегодня» в часовом поясе, первый день недели и подписи локали.
 *
 * Строки Intl сверяются с тем же форматтером, а не с литералом: ICU разных
 * версий Node пишет их по-разному. Оракул дней — `Date` через
 * `setUTCFullYear`: `Date.UTC` уносит годы 0–99 в 1900-е.
 */

const FIRST_DAYS: readonly TWeekday[] = [0, 1, 2, 3, 4, 5, 6]

/** Полночь даты в UTC — мимо ловушки `Date.UTC` с годами 0–99. */
function utc(year: number, month: number, day: number): Date {
	const date = new Date(0)

	date.setUTCFullYear(year, month - 1, day)

	return date
}

/** Форматтер для сверки подписей — как у календаря: в UTC. */
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
	return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' })
}

/** Дни, которые сетка отдала месяцу, без заполнителей. */
function inside(grid: ReturnType<typeof monthGrid>): TCalendarDate[] {
	return grid.flat().flatMap(({ date, outside }) => (outside ? [] : [date]))
}

describe('разбор даты', () => {
	it('дата в формате, которая есть в календаре, — как есть', () => {
		for (const date of [
			'2026-09-26',
			'2024-02-29',
			'2000-02-29',
			'0001-01-01',
			'0099-12-31',
			'9999-12-31',
		]) {
			expect(parseDate(date), date).toBe(date)
		}
	})

	it('несуществующий день — undefined', () => {
		for (const date of [
			'2026-02-30',
			'2023-02-29',
			'1900-02-29',
			'2026-04-31',
			'2026-13-01',
			'2026-00-10',
			'2026-09-00',
			'0000-01-01',
		]) {
			expect(parseDate(date), date).toBeUndefined()
		}
	})

	it('не тот формат и не строка — undefined', () => {
		for (const value of [
			'2026-9-5',
			'26-09-05',
			'02026-09-05',
			'2026/09/26',
			'2026-09-26T10:00',
			' 2026-09-26',
			'２０２６-09-26',
			'',
			'сегодня',
			20260926,
			null,
			undefined,
			new Date(),
			['2026-09-26'],
		]) {
			expect(parseDate(value), String(value)).toBeUndefined()
		}
	})
})

describe('дата из чисел', () => {
	it('дата есть — строка YYYY-MM-DD, год не короче четырёх цифр', () => {
		expect(dateIfExists(2026, 5, 12)).toBe('2026-05-12')
		expect(dateIfExists(2024, 2, 29)).toBe('2024-02-29')
		expect(dateIfExists(5, 1, 1)).toBe('0005-01-01')
		expect(dateIfExists(9999, 12, 31)).toBe(LAST_DATE)
	})

	it('даты нет — undefined, а не перенос в соседний месяц', () => {
		for (const [year, month, day] of [
			[2026, 2, 29],
			[2026, 2, 31],
			[2026, 13, 1],
			[2026, 0, 1],
			[0, 1, 1],
			[10000, 1, 1],
			[2026, 5, 0],
			[2026, 5.5, 1],
			[Number.NaN, 1, 1],
		]) {
			expect(dateIfExists(year, month, day), `${year}-${month}-${day}`).toBeUndefined()
		}
	})

	it('дней в месяце — с високосным февралём', () => {
		expect(daysInMonth(2026, 2)).toBe(28)
		expect(daysInMonth(2024, 2)).toBe(29)
		expect(daysInMonth(1900, 2)).toBe(28)
		expect(daysInMonth(2000, 2)).toBe(29)
		expect(daysInMonth(2026, 4)).toBe(30)
		expect(daysInMonth(2026, 12)).toBe(31)
	})
})

describe('сдвиги', () => {
	it('дни — через концы месяца и года', () => {
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
		expect(addDays('2027-01-01', -1)).toBe('2026-12-31')
		expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
		expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
		expect(addDays('2026-09-26', 365)).toBe('2027-09-26')
	})

	it('месяцы — число прижимается к длине месяца', () => {
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
		expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
		expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
		expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
		expect(addMonths('2026-01-15', -1)).toBe('2025-12-15')
		expect(addMonths('2026-05-31', 13)).toBe('2027-06-30')
	})

	it('29 февраля ± год — 28-е в невисокосном, 29-е через четыре года', () => {
		expect(addYears('2024-02-29', 1)).toBe('2025-02-28')
		expect(addYears('2024-02-29', -1)).toBe('2023-02-28')
		expect(addYears('2024-02-29', 4)).toBe('2028-02-29')
	})

	it('единицы: день, неделя, месяц, год', () => {
		expect(shiftDate('2026-09-26', 'day', -1)).toBe('2026-09-25')
		expect(shiftDate('2026-09-26', 'week', 1)).toBe('2026-10-03')
		expect(shiftDate('2026-09-26', 'month', 1)).toBe('2026-10-26')
		expect(shiftDate('2026-09-26', 'year', -1)).toBe('2025-09-26')
	})

	it('число шагов — целое: дробное округляется, NaN — ни одного', () => {
		expect(addDays('2026-09-26', 1.6)).toBe('2026-09-28')
		expect(shiftDate('2026-09-26', 'week', 1.4)).toBe('2026-10-03')
		expect(addMonths('2026-09-26', Number.NaN)).toBe('2026-09-26')
	})

	it('за краем поддерживаемых дат — край', () => {
		expect(addDays(FIRST_DATE, -1)).toBe(FIRST_DATE)
		expect(addDays(LAST_DATE, 1)).toBe(LAST_DATE)
		expect(addDays(FIRST_DATE, Number.POSITIVE_INFINITY)).toBe(LAST_DATE)
		expect(addMonths('0001-01-15', -1)).toBe(FIRST_DATE)
		expect(addYears('9999-06-15', 1)).toBe(LAST_DATE)
		expect(addYears('2026-09-26', Number.NEGATIVE_INFINITY)).toBe(FIRST_DATE)
	})
})

describe('годы 0001, 0099 и 9999', () => {
	it('день недели совпадает с Date', () => {
		const dates: Array<[TCalendarDate, Date]> = [
			['0001-01-01', utc(1, 1, 1)],
			['0099-12-31', utc(99, 12, 31)],
			['0100-03-01', utc(100, 3, 1)],
			['1970-01-01', utc(1970, 1, 1)],
			['9999-12-31', utc(9999, 12, 31)],
		]

		for (const [date, oracle] of dates) {
			expect(dayOfWeek(date), date).toBe(oracle.getUTCDay())
		}
	})

	it('сдвиги через конец года с короткой записью', () => {
		expect(addDays('0001-12-31', 1)).toBe('0002-01-01')
		expect(addDays('0099-12-31', 1)).toBe('0100-01-01')
		expect(addMonths('0099-12-15', 1)).toBe('0100-01-15')
		expect(addYears('0096-02-29', 4)).toBe('0100-02-28')
	})

	it('подпись года 99 — 99-й год, а не 1999-й', () => {
		const title = formatter('en-US', { month: 'long', year: 'numeric' })

		expect(calendarLocale('en-US').monthTitle('0099-05-01')).toBe(title.format(utc(99, 5, 1)))
		expect(calendarLocale('en-US').monthTitle('0099-05-01')).not.toBe(
			title.format(Date.UTC(99, 4, 1)),
		)
	})
})

describe('сравнение, границы, месяцы', () => {
	it('порядок дат — порядок строк', () => {
		expect(compareDates('2026-09-26', '2026-09-27')).toBeLessThan(0)
		expect(compareDates('2026-10-01', '2026-09-30')).toBeGreaterThan(0)
		expect(compareDates('2026-09-26', '2026-09-26')).toBe(0)
		expect(orderDates('2026-09-27', '2026-09-26')).toEqual(['2026-09-26', '2026-09-27'])
	})

	it('прижатие к [min, max]; max раньше min — отрезок схлопывается в min', () => {
		expect(clampDate('2026-09-26', '2026-10-01', '2026-10-31')).toBe('2026-10-01')
		expect(clampDate('2026-11-26', '2026-10-01', '2026-10-31')).toBe('2026-10-31')
		expect(clampDate('2026-10-15', '2026-10-01', '2026-10-31')).toBe('2026-10-15')
		expect(clampDate('2026-10-15', '2026-10-20', '2026-10-10')).toBe('2026-10-20')
	})

	it('первое число и расстояние в месяцах', () => {
		expect(startOfMonth('2026-09-26')).toBe('2026-09-01')
		expect(monthsBetween('2026-09-26', '2027-01-01')).toBe(4)
		expect(monthsBetween('2027-01-31', '2026-12-01')).toBe(-1)
	})

	it('год — числом, без ведущих нулей', () => {
		expect(yearOf('2026-09-26')).toBe(2026)
		expect(yearOf('0099-05-01')).toBe(99)
		expect(yearOf(LAST_DATE)).toBe(9999)
	})
})

describe('неделя', () => {
	it('края недели при каждом первом дне', () => {
		for (const first of FIRST_DAYS) {
			for (const date of ['2026-09-26', '2026-10-01', '2024-02-29']) {
				const start = startOfWeek(date, first)
				const end = endOfWeek(date, first)

				expect(dayOfWeek(start), `${date} от ${first}`).toBe(first)
				expect(addDays(start, 6)).toBe(end)
				expect(compareDates(start, date)).toBeLessThanOrEqual(0)
				expect(compareDates(date, end)).toBeLessThanOrEqual(0)
			}
		}
	})

	it('неделя с воскресенья и с понедельника', () => {
		// 2026-09-26 — суббота
		expect([startOfWeek('2026-09-26', 0), endOfWeek('2026-09-26', 0)]).toEqual([
			'2026-09-20',
			'2026-09-26',
		])
		expect([startOfWeek('2026-09-26', 1), endOfWeek('2026-09-26', 1)]).toEqual([
			'2026-09-21',
			'2026-09-27',
		])
	})

	it('край недели за краем поддерживаемых дат — край', () => {
		// 0001-01-01 — понедельник: неделя с воскресенья началась бы в нулевом году
		expect(startOfWeek(FIRST_DATE, 0)).toBe(FIRST_DATE)
		expect(endOfWeek(LAST_DATE, 1)).toBe(LAST_DATE)
	})
})

describe('сетка месяца', () => {
	it('целые недели от первого дня, дни месяца по порядку, соседние помечены', () => {
		for (const first of FIRST_DAYS) {
			for (let month = 1; month <= 12; month++) {
				const key = `2026-${String(month).padStart(2, '0')}-01`
				const grid = monthGrid(key, first)
				const days = grid.flat()
				const last = addDays(addMonths(key, 1), -1)

				expect(grid.length, `${key} от ${first}`).toBeGreaterThanOrEqual(4)
				expect(grid.length).toBeLessThanOrEqual(6)
				expect(grid.every((week) => week.length === 7)).toBe(true)
				expect(grid.every((week) => dayOfWeek(week[0].date) === first)).toBe(true)

				// Дни подряд, без пропусков и повторов
				days.forEach((day, index) => {
					if (index > 0) expect(addDays(days[index - 1].date, 1)).toBe(day.date)
				})

				// Свои — ровно дни месяца, чужие — соседних месяцев
				expect(inside(grid)[0]).toBe(key)
				expect(inside(grid).at(-1)).toBe(last)
				expect(inside(grid)).toHaveLength(Number(last.slice(-2)))
				expect(
					days.every(({ date, outside }) => outside === (startOfMonth(date) !== key)),
				).toBe(true)
			}
		}
	})

	it('четыре строки — у февраля, который начинается с первого дня недели', () => {
		// 2026-02-01 — воскресенье, 2021-02-01 — понедельник
		expect(monthGrid('2026-02-01', 0)).toHaveLength(4)
		expect(monthGrid('2021-02-01', 1)).toHaveLength(4)
	})

	it('шесть строк — у длинного месяца, который начинается с последнего дня недели', () => {
		// 2026-08-01 — суббота, 2026-03-01 — воскресенье
		expect(monthGrid('2026-08-01', 0)).toHaveLength(6)
		expect(monthGrid('2026-03-01', 1)).toHaveLength(6)
	})

	it('у краёв поддерживаемых дат заполнители не прижимаются: даты сетки не повторяются', () => {
		const first = monthGrid('0001-01-01', 0).flat()
		const last = monthGrid('9999-12-01', 1).flat()

		expect(first[0]).toEqual({ date: '0000-12-31', outside: true })
		expect(last.slice(-2)).toEqual([
			{ date: '10000-01-01', outside: true },
			{ date: '10000-01-02', outside: true },
		])
		expect(new Set(first.map(({ date }) => date)).size).toBe(first.length)
		expect(new Set(last.map(({ date }) => date)).size).toBe(last.length)
		// Пятизначный год — позже любого четырёхзначного
		expect(compareDates('10000-01-01', LAST_DATE)).toBeGreaterThan(0)
	})
})

describe('первый день недели', () => {
	it('по региону локали: en-US — воскресенье, ru — понедельник', () => {
		expect(calendarLocale('en-US').firstDay).toBe(0)
		expect(calendarLocale('en').firstDay).toBe(0)
		expect(calendarLocale('ru').firstDay).toBe(1)
		expect(calendarLocale('ru-RU').firstDay).toBe(1)
	})

	it('по региону из каждой группы таблицы', () => {
		expect(calendarLocale('es-MX').firstDay).toBe(0)
		expect(calendarLocale('dv-MV').firstDay).toBe(5)
		expect(calendarLocale('ar-EG').firstDay).toBe(6)
		// Регион выведен из языка: fa → IR
		expect(calendarLocale('fa').firstDay).toBe(6)
		// Регионов понедельника в таблице нет
		expect(calendarLocale('de-DE').firstDay).toBe(1)
		expect(calendarLocale('en-001').firstDay).toBe(1)
	})

	it('ключ -u-fw- главнее региона', () => {
		expect(calendarLocale('en-US-u-fw-mon').firstDay).toBe(1)
		expect(calendarLocale('ru-RU-u-fw-sun').firstDay).toBe(0)
		expect(calendarLocale('ar-EG-u-ca-gregory-fw-thu').firstDay).toBe(4)
		expect(calendarLocale('EN-us-U-FW-SAT').firstDay).toBe(6)
		// Неизвестное значение ключа — как без ключа
		expect(calendarLocale('en-US-u-fw-xyz').firstDay).toBe(0)
	})

	it('невалидная и пустая локаль — умолчание en-US, а не исключение', () => {
		for (const tag of ['not a locale!', '', undefined]) {
			const locale = calendarLocale(tag)

			expect(locale.locale, String(tag)).toBe('en-US')
			expect(locale.firstDay).toBe(0)
		}
	})

	it('одна локаль на тег', () => {
		expect(calendarLocale('ru')).toBe(calendarLocale('ru'))
	})
})

describe('сегодня', () => {
	afterEach(() => {
		vi.useRealTimers()
	})

	it('один момент в UTC и Asia/Tokyo — разные дни', () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		vi.setSystemTime(Date.UTC(2026, 8, 26, 20))

		expect(todayDate('UTC')).toBe('2026-09-26')
		expect(todayDate('Asia/Tokyo')).toBe('2026-09-27')
	})

	it('без пояса — пояс среды; невалидный пояс — тоже', () => {
		vi.useFakeTimers({ toFake: ['Date'] })
		// Полдень по местному времени: тот же день в поясе среды, каким бы он ни был
		vi.setSystemTime(new Date(2026, 8, 26, 12))

		expect(todayDate()).toBe('2026-09-26')
		expect(todayDate('Mars/Base')).toBe('2026-09-26')
	})
})

describe('подписи', () => {
	const september = utc(2026, 9, 1)

	it('у th-TH — буддийский год', () => {
		const locale = calendarLocale('th-TH')
		const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

		expect(locale.calendar).toBe('buddhist')
		expect(locale.monthTitle('2026-09-01')).toBe(
			formatter('th-TH', { ...options, calendar: 'buddhist' }).format(september),
		)
		expect(locale.monthTitle('2026-09-01')).not.toBe(
			formatter('th-TH', { ...options, calendar: 'gregory' }).format(september),
		)
	})

	it('у fa-IR — григорианский: персидский месяц не лёг бы на сетку', () => {
		const locale = calendarLocale('fa-IR')
		const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' }

		expect(locale.calendar).toBe('gregory')
		expect(locale.monthTitle('2026-09-01')).toBe(
			formatter('fa-IR', { ...options, calendar: 'gregory' }).format(september),
		)
		expect(locale.monthTitle('2026-09-01')).not.toBe(
			formatter('fa-IR', options).format(september),
		)
	})

	it('календарь из тега: японский — с эрами, остальное — григорианский', () => {
		expect(calendarLocale('ja-JP-u-ca-japanese').calendar).toBe('japanese')
		expect(calendarLocale('zh-TW-u-ca-roc').calendar).toBe('roc')
		expect(calendarLocale('th-TH-u-ca-gregory').calendar).toBe('gregory')
		expect(calendarLocale('en-US-u-ca-hebrew').calendar).toBe('gregory')
	})

	it('номер дня у ja-JP — без «日»', () => {
		const day = formatter('ja-JP', { day: 'numeric' })
		const number = day
			.formatToParts(utc(2026, 9, 26))
			.find((part) => part.type === 'day')?.value

		expect(calendarLocale('ja-JP').dayNumber('2026-09-26')).toBe(number)
		expect(calendarLocale('ja-JP').dayNumber('2026-09-26')).not.toContain('日')
		expect(day.format(utc(2026, 9, 26))).toContain('日')
	})

	it('номер дня — в цифрах локали', () => {
		const number = formatter('ar-EG', { day: 'numeric' })
			.formatToParts(utc(2026, 9, 26))
			.find((part) => part.type === 'day')?.value

		expect(calendarLocale('ar-EG').dayNumber('2026-09-26')).toBe(number)
		expect(number).not.toBe('26')
	})

	it('полная дата и имена дней недели', () => {
		const locale = calendarLocale('ru')
		// 2026-09-28 — понедельник
		const monday = utc(2026, 9, 28)

		expect(locale.fullDate('2026-09-26')).toBe(
			formatter('ru', { dateStyle: 'full' }).format(utc(2026, 9, 26)),
		)
		expect(locale.weekdayName(1, 'long')).toBe(
			formatter('ru', { weekday: 'long' }).format(monday),
		)
		expect(locale.weekdayName(1, 'narrow')).toBe(
			formatter('ru', { weekday: 'narrow' }).format(monday),
		)
	})

	it('имя месяца — короткое, самостоятельная форма: «март», а не «марта»', () => {
		const march = utc(2026, 3, 1)

		expect(calendarLocale('ru').monthName('2026-03-15')).toBe(
			formatter('ru', { month: 'short' }).format(march),
		)
		expect(calendarLocale('ru').monthName('2026-03-15')).not.toBe(
			formatter('ru', { day: 'numeric', month: 'short' })
				.formatToParts(march)
				.find((part) => part.type === 'month')?.value,
		)
		expect(calendarLocale('en-US').monthName('2026-03-15')).toBe(
			formatter('en-US', { month: 'short' }).format(march),
		)
	})

	it('год и отрезок лет — в календаре подписей: у th-TH буддийские', () => {
		const locale = calendarLocale('th-TH')
		const year = formatter('th-TH', { year: 'numeric', calendar: 'buddhist' })

		expect(locale.yearTitle('2026-09-01')).toBe(year.format(utc(2026, 1, 1)))
		expect(locale.yearsTitle('2017-01-01', '2028-01-01')).toBe(
			year.formatRange(utc(2017, 1, 1), utc(2028, 1, 1)),
		)
		expect(calendarLocale('en-US').yearsTitle('2017-01-01', '2028-01-01')).toBe(
			formatter('en-US', { year: 'numeric' }).formatRange(utc(2017, 1, 1), utc(2028, 1, 1)),
		)
	})

	it('подпись года 99 — 99-й год, а не 1999-й', () => {
		expect(calendarLocale('en-US').yearTitle('0099-01-01')).toBe(
			formatter('en-US', { year: 'numeric' }).format(utc(99, 1, 1)),
		)
	})

	it('локаль, которой нет у движка, подписана по-английски, а не языком среды', () => {
		const title = formatter('en-US', { month: 'long', year: 'numeric' })

		expect(calendarLocale('zz').monthTitle('2026-09-01')).toBe(title.format(september))
	})
})
