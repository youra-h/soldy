import { DEFAULT_LOCALE } from '../../../../common'
import type { TNumberInputFormatOptions } from '../types'
import { TNumberFormat } from './number-format.class'
import type { INumberFormat } from './types'

/**
 * Опции, текст которых обратно не разобрать: сокращённая запись («1,2 тыс.»,
 * «1.2E3»), бухгалтерский знак в скобках. Тип опций их не пускает, а здесь они
 * снимаются и у опций, пришедших мимо типов, — иначе поле показало бы число,
 * которое само не прочтёт.
 */
const UNREADABLE = ['notation', 'compactDisplay', 'currencySign'] as const

/**
 * Форматы по тегу, как его задали, и по опциям. Карта заводится при первом
 * обращении, а не при загрузке модуля: приложению без поля числа она не нужна.
 */
let formats: Map<string, Map<string, INumberFormat>> | undefined

/**
 * Формат поля числа в локали `locale` и опциях `options` — один на тег и
 * опции: форматтеры Intl и знаки локали собираются один раз и служат всем
 * полям с ними. Опции сверяются по содержимому. Невалидный и пустой тег —
 * `en-US`, опции, с которыми Intl не строит формат (валюта без кода), —
 * простое число: поле не падает из-за опции.
 */
export function numberFormat(
	locale: string | undefined,
	options: TNumberInputFormatOptions | undefined,
): INumberFormat {
	formats ??= new Map()

	const byLocale = cached(formats, locale ?? '', () => new Map())

	return cached(byLocale, keyOf(options), () => createFormat(locale, options))
}

/** Значение карты по ключу; нет — создаётся и запоминается. */
function cached<K, V>(map: Map<K, V>, key: K, create: () => NoInfer<V>): V {
	let value = map.get(key)

	if (value === undefined) {
		value = create()
		map.set(key, value)
	}

	return value
}

/** Ключ опций — по содержимому, в порядке имён: значения у них простые. */
function keyOf(options: TNumberInputFormatOptions | undefined): string {
	return JSON.stringify(
		Object.entries(options ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	)
}

/** Формат по тегу и опциям: локали списком `[тег, 'en-US']`, как у подписей дат. */
function createFormat(
	tag: string | undefined,
	options: TNumberInputFormatOptions | undefined,
): INumberFormat {
	const locales = [localeOf(tag), DEFAULT_LOCALE]

	return new TNumberFormat(formatterOf(locales, readable(options)))
}

/** Канонический тег; невалидный и пустой — `en-US`. */
function localeOf(tag: string | undefined): string {
	if (!tag) return DEFAULT_LOCALE

	try {
		return Intl.getCanonicalLocales(tag)[0] ?? DEFAULT_LOCALE
	} catch {
		return DEFAULT_LOCALE
	}
}

/** Форматтер с опциями; не строится с ними — без них. */
function formatterOf(
	locales: readonly string[],
	options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
	try {
		return new Intl.NumberFormat(locales, options)
	} catch {
		return new Intl.NumberFormat(locales)
	}
}

/** Опции без тех, чей текст не разобрать, и без знака, который прячет минус. */
function readable(options: TNumberInputFormatOptions | undefined): Intl.NumberFormatOptions {
	const result: Intl.NumberFormatOptions = { ...options }

	for (const key of UNREADABLE) delete result[key]

	if (result.signDisplay === 'never') delete result.signDisplay

	return result
}
