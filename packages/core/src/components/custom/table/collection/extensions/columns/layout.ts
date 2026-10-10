import { COLUMN_WIDTH, RESIZE_MIN, clampWidth } from '../../../column/width'
import type { TTableColumnFit } from '../../../types'

/** Что раскладка знает о показанной колонке: своя ширина и границы — как заданы. */
type TLayoutSource = {
	/** Своя ширина; нет — колонка гибкая */
	width: number | undefined
	minWidth: number | undefined
	maxWidth: number | undefined
}

/** Итог раскладки показанных колонок. */
type TLayout = {
	/**
	 * Ширины раскладки, px, по порядку колонок. У колонки со своей шириной —
	 * `undefined`: её ширину решает своё значение. Место неизвестно, а режим
	 * заполняет место, — `undefined` у всех: ширины решает тема
	 */
	widths: Array<number | undefined>
	/** Колонки шире места. Место неизвестно — `undefined` */
	overflow: boolean | undefined
}

/** Ход гибкой колонки в режиме заполнения, в целых px: `hi` бывает бесконечным. */
type TSpan = { lo: number; hi: number }

/**
 * Раскладка показанных колонок таблицы по месту `space` (px; `undefined` —
 * место неизвестно) и режиму `fit`.
 *
 * Колонка со своей шириной — фиксированная: её итог — своё значение,
 * прижатое к границам, и раскладка его только учитывает. Колонка без своей
 * ширины — гибкая, и её ширину раскладка считает:
 *
 * - `none` — ширина по умолчанию, прижатая к границам; места раскладка не
 *   ждёт;
 * - `auto` — от ширины по умолчанию до `maxWidth`: гибкие колонки делят место,
 *   оставшееся от фиксированных, общим уровнем — каждая не уже своего начала
 *   и не шире своего конца, остальные вровень;
 * - `contain` — так же, но от `minWidth` (без неё — нижний предел ручки):
 *   колонки ровно заполняют место, сжимаясь.
 *
 * В режимах заполнения сумма ширин — ровно место, в целых px: остаток уровня
 * получают по пикселю первые колонки. Не хватает места и на начала колонок —
 * они на началах, и колонки шире места; упёрлись все в концы — уже места.
 * `minWidth` больше `maxWidth` — побеждает `minWidth`, как у итога колонки.
 */
export function layoutColumns(
	space: number | undefined,
	fit: TTableColumnFit,
	columns: readonly TLayoutSource[],
): TLayout {
	const fixed = columns.map(({ width, minWidth, maxWidth }) =>
		clampWidth(width, minWidth, maxWidth),
	)
	const flexible = columns.filter((_, index) => fixed[index] === undefined)
	const shares = shareOf(space, fit, flexible, sumOf(fixed))
	const widths: Array<number | undefined> = []
	let next = 0

	for (const width of fixed) widths.push(width === undefined ? shares?.[next++] : undefined)

	return {
		widths,
		overflow: space === undefined ? undefined : sumOf(fixed) + sumOf(widths) > space,
	}
}

/**
 * Ширины гибких колонок по порядку, когда их можно считать: место известно или
 * режим места не ждёт. `taken` — что заняли фиксированные колонки.
 */
function shareOf(
	space: number | undefined,
	fit: TTableColumnFit,
	flexible: readonly TLayoutSource[],
	taken: number,
): number[] | undefined {
	if (fit === 'none') return flexible.map(({ minWidth, maxWidth }) => baseOf(minWidth, maxWidth))

	if (space === undefined) return undefined

	const spans = flexible.map(({ minWidth, maxWidth }) =>
		spanOf(fit === 'auto' ? baseOf(minWidth, maxWidth) : lowerOf(minWidth, maxWidth), maxWidth),
	)

	return share(Math.floor(space - taken), spans)
}

/** Ширина по умолчанию в границах колонки. */
function baseOf(min: number | undefined, max: number | undefined): number {
	return clampWidth(COLUMN_WIDTH, min, max) ?? COLUMN_WIDTH
}

/**
 * Начало гибкой колонки в `contain` — `minWidth`, без неё — нижний предел
 * ручки, но не шире `maxWidth`: предел ядра своей границы колонки не
 * переходит.
 */
function lowerOf(min: number | undefined, max: number | undefined): number {
	return min ?? Math.min(RESIZE_MIN, max ?? RESIZE_MIN)
}

/**
 * Ход в целых px: начало вверх, конец вниз, но не уже начала — нижняя
 * граница сильнее верхней. Без `maxWidth` конец бесконечен.
 */
function spanOf(lo: number, max: number | undefined): TSpan {
	const start = Math.ceil(lo)

	return { lo: start, hi: max === undefined ? Infinity : Math.max(start, Math.floor(max)) }
}

/**
 * `total` целых px — колонкам с ходами `spans`, общим уровнем: колонка на
 * уровне, а не ниже своего начала и не выше конца. Уровень — наибольший, при
 * котором сумма не больше `total`; что осталось до `total`, получают по
 * пикселю первые колонки, которые на уровне ещё растут. Сумма — ровно
 * `total`, кроме двух краёв: не хватает и на начала — все на началах, хватает
 * с избытком на концы — все на концах.
 */
function share(total: number, spans: readonly TSpan[]): number[] {
	if (spans.length === 0) return []

	const at = (level: number): number[] => spans.map(({ lo, hi }) => within(level, lo, hi))
	const sum = (level: number): number => sumOf(at(level))

	let low = Math.min(...spans.map(({ lo }) => lo))

	if (sum(low) >= total) return at(low)

	// Конца нет хотя бы у одной колонки — на уровне `total` сумма не меньше
	// `total`: такая колонка одна берёт весь `total`
	let high = Math.min(Math.max(...spans.map(({ hi }) => hi)), total)

	if (sum(high) <= total) return at(high)

	// Сумма на `low` меньше `total`, на `high` — больше
	while (high - low > 1) {
		const middle = Math.floor((low + high) / 2)

		if (sum(middle) <= total) low = middle
		else high = middle
	}

	const widths = at(low)
	let rest = total - sumOf(widths)

	for (let index = 0; index < widths.length && rest > 0; index++) {
		if (widths[index] !== low || low >= spans[index].hi) continue

		widths[index]++
		rest--
	}

	return widths
}

/** Число в отрезке. */
function within(value: number, low: number, high: number): number {
	return Math.min(Math.max(value, low), high)
}

/** Сумма известных ширин. */
function sumOf(widths: ReadonlyArray<number | undefined>): number {
	return widths.reduce<number>((acc, width) => acc + (width ?? 0), 0)
}
