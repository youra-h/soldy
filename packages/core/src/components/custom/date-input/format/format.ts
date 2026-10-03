import { DEFAULT_LOCALE, calendarLocale } from '../../../../common'
import { groupSpecsOf } from '../date-time'
import type { TFieldPart } from '../segments'
import type { TDateFieldPart, TDateInputKind } from '../types'
import type { IDateFieldFormat, TDateFieldToken, TPartGroup } from './types'

/**
 * Опорный момент формата — 12 мая 2026, 14:30 UTC. По нему видно направление
 * ряда и сдвиг года календаря поля: число дня не совпадает с номером месяца, а
 * час — ни с днём, ни с минутой, и части не спутать.
 */
const SAMPLE = Date.UTC(2026, 4, 12, 14, 30)
const SAMPLE_YEAR = 2026

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
 * Форматы по тегу, как его задали, и виду поля. Карта заводится при первом
 * обращении, а не при загрузке модуля: приложению без поля даты она не нужна.
 */
let formats: Map<string, Map<TDateInputKind, IDateFieldFormat>> | undefined

/**
 * Формат поля в локали `locale` и виде `kind` — один на тег и
 * вид: форматтеры Intl создаются один раз и служат всем полям с ними.
 * Невалидный и пустой тег — `en-US`.
 */
export function fieldFormat(locale: string | undefined, kind: TDateInputKind): IDateFieldFormat {
	formats ??= new Map()

	const key = locale ?? ''
	let byKind = formats.get(key)

	if (byKind === undefined) {
		byKind = new Map()
		formats.set(key, byKind)
	}

	let format = byKind.get(kind)

	if (format === undefined) {
		format = createFormat(locale, kind)
		byKind.set(kind, format)
	}

	return format
}

/**
 * Формат Intl с частями групп вида поля. Тег и календарь — у локали календаря
 * (`calendarLocale`): календарь поля буддийский, если буддийский календарь
 * подписей, иначе григорианский — эры у поля нет, а японская эра меняется
 * посреди года. Цикл часов — только от локали, с ключом `-u-hc-` тоже.
 *
 * Группы узнают у форматтера своё (сдвиг года, цикл часов) и отдают части;
 * Intl отдал не ровно по одной части каждого типа — формат собирается из
 * запасных форматов групп. У известных движков такой локали нет.
 */
function createFormat(tag: string | undefined, kind: TDateInputKind): IDateFieldFormat {
	const { locale, calendar } = calendarLocale(tag)
	const specs = groupSpecsOf(kind)
	const formatter = new Intl.DateTimeFormat([locale, DEFAULT_LOCALE], {
		...specs.reduce<Intl.DateTimeFormatOptions>(
			(all, spec) => ({ ...all, ...spec.options }),
			{},
		),
		calendar: calendar === 'buddhist' ? 'buddhist' : 'gregory',
		timeZone: 'UTC',
	})
	const resolved = formatter.resolvedOptions()
	const sample = formatter.formatToParts(SAMPLE)
	const digits = digitsOf(resolved.numberingSystem)
	const groups = specs.map((spec) =>
		spec.create({ resolved, sample, sampleYear: SAMPLE_YEAR, digits }),
	)
	const tokens = tokensOf(sample, groups) ?? isoTokensOf(groups)

	return {
		kind,
		tokens,
		parts: tokens.flatMap((token) => (token.type === 'literal' ? [] : [token])),
		groups,
		direction: directionOf(sample.map((part) => part.value).join('')),
		lang: resolved.locale,
		digits,
		names: namesOf(locale),
	}
}

/**
 * Части и литералы формата. Соседние литералы склеиваются, всё, что не часть
 * групп, — тоже литерал. Не ровно по одной части каждого типа — `undefined`.
 */
function tokensOf(
	sample: readonly Intl.DateTimeFormatPart[],
	groups: readonly TPartGroup[],
): readonly TDateFieldToken[] | undefined {
	const expected = groups.flatMap((group) => group.parts)
	const tokens: TDateFieldToken[] = []
	const seen = new Set<TFieldPart>()

	for (const { type, value } of sample) {
		const last = tokens[tokens.length - 1]
		const part = expected.find((candidate) => candidate.type === type)

		if (part !== undefined && !seen.has(part)) {
			seen.add(part)
			tokens.push(part)
		} else if (last?.type === 'literal') {
			tokens[tokens.length - 1] = { type: 'literal', text: last.text + value }
		} else {
			tokens.push({ type: 'literal', text: value })
		}
	}

	return seen.size === expected.length ? tokens : undefined
}

/** Запасной формат — ISO: запасные форматы групп через пробел. */
function isoTokensOf(groups: readonly TPartGroup[]): readonly TDateFieldToken[] {
	return groups.flatMap((group, index): readonly TDateFieldToken[] =>
		index === 0 ? group.isoTokens : [{ type: 'literal', text: ' ' }, ...group.isoTokens],
	)
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
 * Имена частей для скринридера — `Intl.DisplayNames` с типом
 * `dateTimeField`, локали списком `[тег, 'en-US']`, как у подписей. Движок без
 * таких имён — имена типов частей: своих строк у библиотеки нет.
 */
function namesOf(locale: string): Readonly<Record<TDateFieldPart, string>> {
	let of = (part: TDateFieldPart): string => part

	try {
		const names = new Intl.DisplayNames([locale, DEFAULT_LOCALE], { type: 'dateTimeField' })

		of = (part) => names.of(part) ?? part
	} catch {
		// Движок без имён — имена типов
	}

	return {
		day: of('day'),
		month: of('month'),
		year: of('year'),
		hour: of('hour'),
		minute: of('minute'),
		dayPeriod: of('dayPeriod'),
	}
}
