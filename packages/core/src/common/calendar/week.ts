import { weekdayOf } from './date'
import { WEEK_START_REGIONS } from './week-data'
import type { TWeekday } from './types'

/** Понедельник — первый день недели у мира (`001`) в CLDR и у ISO 8601. */
const MONDAY: TWeekday = 1

/** Значения ключа `fw` расширения `-u-` по порядку дней недели: воскресенье — 0. */
const WEEKDAY_KEYWORDS: readonly string[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

/**
 * Первый день недели по каноническому тегу локали — одним путём и на сервере,
 * и в браузере:
 *
 * 1. ключ `fw` расширения `-u-`: `en-US-u-fw-mon` — понедельник;
 * 2. регион — из тега или выведенный (`Intl.Locale#maximize`: `ru` → `RU`), по
 *    таблице CLDR (`week-data.ts`);
 * 3. региона нет или его нет в таблице — понедельник.
 */
export function firstDayOfWeek(locale: string): TWeekday {
	return keywordDay(locale) ?? regionDay(locale) ?? MONDAY
}

/**
 * День из ключа `fw`. Тег канонический: подтеги расширений в нижнем регистре,
 * одиночный подтег открывает расширение, `x` — частное использование до конца
 * тега, ключей в нём нет.
 */
function keywordDay(locale: string): TWeekday | undefined {
	const subtags = locale.split('-')
	let unicode = false

	for (let index = 0; index < subtags.length; index++) {
		const subtag = subtags[index]

		if (subtag === 'x') return undefined

		if (subtag.length === 1) {
			unicode = subtag === 'u'
		} else if (unicode && subtag === 'fw') {
			const day = WEEKDAY_KEYWORDS.indexOf(subtags[index + 1])

			return day < 0 ? undefined : weekdayOf(day)
		}
	}

	return undefined
}

/** День по региону локали; у региона, где неделя с понедельника, — `undefined`. */
function regionDay(locale: string): TWeekday | undefined {
	const region = regionOf(locale)

	if (region === undefined) return undefined

	return WEEK_START_REGIONS.find(([, regions]) => regions.split(' ').includes(region))?.[0]
}

function regionOf(locale: string): string | undefined {
	try {
		return new Intl.Locale(locale).maximize().region
	} catch {
		return undefined
	}
}
