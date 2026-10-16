import { DEFAULT_LOCALE } from '../../../common'
import type { TPaginationPage, TPaginationValue } from './types'

/**
 * Страницы пагинации и окно — чистые функции.
 *
 * Страниц у числовой пагинации бывают десятки тысяч, и ни одна функция здесь
 * их не перебирает: число страниц — деление, место по ключу — сам ключ, окно
 * — не больше «середина + 4» мест. Перебор — только у текстовой, и он по её
 * списку, который задало приложение.
 */

/**
 * Откуда берутся страницы: из списка `pages`, а без него — по числу
 * элементов и размеру страницы. Пагинация подходит сама.
 */
export type TPageSource = {
	readonly total: number
	readonly pageSize: number
	readonly pages: readonly TPaginationPage[] | undefined
}

/** Место в окне: страница на своём месте (с единицы) или пропуск между страницами. */
export type TPageWindowEntry =
	{ readonly kind: 'page'; readonly position: number } | { readonly kind: 'ellipsis' }

/**
 * Сколько страниц.
 *
 * У текстовой пагинации — длина списка `pages`: пустой список — ни одной
 * страницы. У числовой — `⌈total / pageSize⌉`, но не меньше одной: пустые
 * данные — одна пустая страница, а не пустая пагинация. Дробное `total` —
 * его целая часть, отрицательное и не число — ноль; размер страницы меньше
 * единицы и не число — одна страница на всё.
 */
export function pageCount(source: TPageSource): number {
	if (source.pages) return source.pages.length

	const total = Number.isFinite(source.total) ? Math.max(0, Math.floor(source.total)) : 0
	const size = Number.isFinite(source.pageSize) ? Math.floor(source.pageSize) : 0

	return size >= 1 ? Math.max(1, Math.ceil(total / size)) : 1
}

/**
 * Ключ страницы на месте `position`, с единицы. Места нет — `undefined`.
 *
 * У числовой пагинации ключ — сам номер, у текстовой — `value` страницы, а
 * без него — её номер.
 */
export function pageKey(source: TPageSource, position: number): TPaginationValue | undefined {
	if (!Number.isInteger(position) || position < 1 || position > pageCount(source)) {
		return undefined
	}

	return source.pages ? (source.pages[position - 1].value ?? position) : position
}

/**
 * Место страницы с ключом `key`, с единицы; такой страницы нет — 0.
 *
 * Ключ сверяется строго: у числовой пагинации ключ — число, и строка `'3'`
 * страницей 3 не считается, как радио со значением `3` не отмечается
 * строкой `'3'`.
 */
export function pagePosition(source: TPageSource, key: TPaginationValue): number {
	const pages = source.pages

	if (pages) return pages.findIndex((page, index) => (page.value ?? index + 1) === key) + 1

	return typeof key === 'number' && Number.isInteger(key) && key >= 1 && key <= pageCount(source)
		? key
		: 0
}

/**
 * Сколько страниц стоит в середине окна: `middleCount`, прижатое к 0 и к
 * «страниц − 2» — первая и последняя видны всегда. Дробное — целая часть,
 * не число — 0.
 */
export function middleOf(count: number, middleCount: number): number {
	const middle = Number.isNaN(middleCount) ? 0 : Math.floor(middleCount)

	return Math.min(Math.max(middle, 0), Math.max(count - 2, 0))
}

/**
 * Окно пагинации — что видно между стрелками, по порядку.
 *
 * Мест в окне при любой текущей странице одно число: ряд при листании не
 * меняет длины, и стрелка «вперёд» стоит на месте — нажатие, которое попадало
 * в неё, не уходит в соседнюю страницу. Окно складывают три правила:
 *
 * 1. Первая и последняя страницы видны всегда, между ними — середина:
 *    `middleCount` страниц вокруг текущей (`middleOf`). Чётной середине
 *    лишнее место — после текущей.
 * 2. Середина не подходит к краю вплотную: пока страниц не меньше
 *    «середина + 4», между ней и первой и между ней и последней стоит хотя бы
 *    одна страница — середина прижимается к 3…«страниц − 2». Страниц меньше —
 *    к 2…«страниц − 1».
 * 3. Между соседними видимыми страницами пропущена одна — она и стоит, две и
 *    больше — пропуск.
 *
 * Отсюда мест в окне `min(страниц, середина + 4)`, а при середине 0 —
 * `min(страниц, 3)`. Десять страниц при середине 3: на страницах 1–4 —
 * `1 2 3 4 5 … 10`, на 5 — `1 … 4 5 6 … 10`, на 6 — `1 … 5 6 7 … 10`, на
 * 7–10 — `1 … 6 7 8 9 10`; семь страниц видны все. При середине от 1
 * текущая видна всегда, при середине 0 между первой и последней её нет:
 * `1 … 10`.
 *
 * Текущей страницы нет (`position` — 0 или вне страниц) — окно с начала, как
 * на первой странице.
 */
export function pageWindow(
	count: number,
	position: number,
	middleCount: number,
): TPageWindowEntry[] {
	if (count < 1) return []

	const current = position >= 1 && position <= count ? position : 1
	const middle = middleOf(count, middleCount)
	// До текущей — меньшая половина: лишнее место чётной середины — после неё
	const before = Math.floor((middle - 1) / 2)
	// Отступ середины от края — место под страницу или пропуск, пока на него
	// хватает страниц
	const margin = count >= middle + 4 ? 1 : 0
	const start = Math.min(Math.max(2 + margin, current - before), count - middle - margin)
	const positions = [1]

	for (let place = start; place < start + middle; place++) positions.push(place)

	if (count > 1) positions.push(count)

	const entries: TPageWindowEntry[] = []
	// Перед первой страницей не пропущено ничего
	let previous = 0

	for (const place of positions) {
		const skipped = place - previous - 1

		// Пропущена одна страница — на месте пропуска стоит она: место то же
		if (skipped === 1) entries.push({ kind: 'page', position: previous + 1 })
		else if (skipped > 1) entries.push({ kind: 'ellipsis' })

		entries.push({ kind: 'page', position: place })
		previous = place
	}

	return entries
}

/**
 * Те же ли страницы: обе числовые или обе текстовые с тем же текстом и ключом
 * на каждом месте. Ссылки не сверяются: список, собранный заново тем же
 * составом, — те же страницы.
 */
export function samePages(
	a: readonly TPaginationPage[] | undefined,
	b: readonly TPaginationPage[] | undefined,
): boolean {
	if (a === b) return true

	if (!a || !b || a.length !== b.length) return false

	return a.every((page, index) => page.text === b[index].text && page.value === b[index].value)
}

/** Форматтеры номеров по тегу — один на тег; карта заводится при первом обращении. */
let numberFormats: Map<string, Intl.NumberFormat> | undefined

/**
 * Номер страницы в цифрах и с группами разрядов локали: «12 345» у `ru-RU`,
 * «١٢٬٣٤٥» у `ar-EG`.
 *
 * Локаль у форматтера — списком `[тег, 'en-US']`, как у подписей календаря:
 * тег, которого нет у движка, уходит в английский, а не в язык среды, и
 * сервер с браузером пишут номер одинаково. Невалидный тег — английский, а не
 * исключение.
 */
export function pageNumber(position: number, tag: string): string {
	numberFormats ??= new Map()

	let format = numberFormats.get(tag)

	if (format === undefined) {
		format = numberFormatOf(tag)
		numberFormats.set(tag, format)
	}

	return format.format(position)
}

function numberFormatOf(tag: string): Intl.NumberFormat {
	try {
		return new Intl.NumberFormat([tag, DEFAULT_LOCALE])
	} catch {
		return new Intl.NumberFormat(DEFAULT_LOCALE)
	}
}
