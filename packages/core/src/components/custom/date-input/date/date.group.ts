import {
	DATE_PART_PLACEHOLDERS,
	compareDates,
	dateIfExists,
	daysInMonth,
	parseDate,
	todayDate,
} from '../../../../common'
import type { TCalendarDate, TDatePart } from '../../../../common'
import { AS_IS, clamp, numberOf, numberRule, wrap } from '../segments'
import type { TFieldPart } from '../segments'
import type { TDateFieldToken, TGroupContext, TPartGroup, TPartGroupKind } from '../format'
import type { TDateInputParts, TDatePartLimits } from '../types'

/** Формат частей даты: день и месяц — двумя цифрами, год — полностью. */
const OPTIONS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }

/** Високосный год: месяц без года не короче своей наибольшей длины — февраль 29 дней. */
const LEAP_YEAR = 2000

/** Ход месяца. */
const MONTHS: TDatePartLimits = { min: 1, max: 12 }

/**
 * Группа даты — день, месяц и год. Кусок значения — дата `YYYY-MM-DD`. Числа
 * частей — григорианские, а год, который видит пользователь, — в календаре
 * поля: буддийский у `th-TH` больше на `yearOffset`. День не длиннее месяца:
 * смена месяца или года его прижимает (31-е в апреле — 30-е).
 */
export const DATE_GROUP: TPartGroupKind = {
	options: OPTIONS,
	parse: (text) => {
		const date = parseDate(text)

		return date === undefined ? undefined : partsOfDate(date)
	},
	compose: ({ year, month, day }) =>
		year === undefined || month === undefined || day === undefined
			? undefined
			: dateIfExists(year, month, day),
	compare: compareDates,
	create: createGroup,
}

function createGroup({ sample, sampleYear, digits, resolved }: TGroupContext): TPartGroup {
	const sampled = numberOf(sample.find((part) => part.type === 'year')?.value ?? '', digits)
	const yearOffset = Number.isNaN(sampled) ? 0 : sampled - sampleYear
	const placeholders = placeholdersOf(resolved.locale)

	const day: TFieldPart = {
		type: 'day',
		rule: numberRule(2, digits, {
			...AS_IS,
			placeholder: placeholders.day,
			limits: (parts) => ({ min: 1, max: dayMax(parts) }),
			step: wrap,
		}),
	}
	const month: TFieldPart = {
		type: 'month',
		rule: numberRule(2, digits, {
			...AS_IS,
			placeholder: placeholders.month,
			limits: () => MONTHS,
			step: wrap,
			settle: dayInMonth,
		}),
	}
	const year: TFieldPart = {
		type: 'year',
		rule: numberRule(1, digits, {
			placeholder: placeholders.year,
			limits: () => ({ min: 1 + yearOffset, max: 9999 + yearOffset }),
			shown: (value) => value + yearOffset,
			stored: (shown) => shown - yearOffset,
			step: clamp,
			settle: dayInMonth,
		}),
	}
	const isoTokens: readonly TDateFieldToken[] = [
		year,
		{ type: 'literal', text: '-' },
		month,
		{ type: 'literal', text: '-' },
		day,
	]

	return {
		parts: [day, month, year],
		isoTokens,
		fromText: (read) => ({
			year: read('year') - yearOffset,
			month: read('month'),
			day: read('day'),
		}),
		now: () => partsOfDate(todayDate()),
	}
}

/** Части даты по проверенной дате `YYYY-MM-DD`. */
function partsOfDate(date: TCalendarDate): TDateInputParts {
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

/** Сменили месяц или год — день не длиннее месяца. */
function dayInMonth(parts: TDateInputParts): TDateInputParts {
	const { day } = parts
	const max = dayMax(parts)

	return day !== undefined && day > max ? { ...parts, day: max } : parts
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
