import { clamp } from './rule'
import type { TDigitErase, TFieldPart, TKeyEntry } from './types'
import type { IDateFieldFormat } from '../format'
import type { TDateFieldPart, TDateInputEdge, TDateInputParts } from '../types'

/**
 * Общий механизм частей поля — чистые функции над числами частей.
 *
 * Числа частей хранятся без локали (`TDateInputParts`), а ход, набор и текст —
 * в числах, которые видит пользователь. Чем части различаются, знает правило
 * части (`TPartRule`): о дате и времени механизм не знает, веток по типу части
 * в нём нет. Соседей части согласует её правило (`settle`) — внутри своей
 * группы: месяц прижимает день, период суток переносит час.
 *
 * Набранные цифры части (`typed`) — то, к чему допишется следующая. Пока числа
 * у части нет, их видно вместо подсказки: ноль, с которого день не
 * начинается, — «0».
 */

/** Часть формата по типу; части нет в формате — `undefined`. */
export function fieldPartOf(
	type: TDateFieldPart,
	format: IDateFieldFormat,
): TFieldPart | undefined {
	return format.parts.find((part) => part.type === type)
}

/** Части с новым числом части (`undefined` — очистить) и согласованными соседями. */
export function withPart(
	parts: TDateInputParts,
	part: TFieldPart,
	value: number | undefined,
): TDateInputParts {
	return part.rule.settle({ ...parts, [part.type]: value })
}

/** Части без частей формата `cleared`. */
export function withoutParts(
	parts: TDateInputParts,
	cleared: readonly TDateFieldPart[],
	format: IDateFieldFormat,
): TDateInputParts {
	return format.parts
		.filter((part) => cleared.includes(part.type))
		.reduce((next, part) => withPart(next, part, undefined), parts)
}

/**
 * Пусто ли поле: ни у одной части формата нет числа, и ничего не набрано —
 * разделители тогда часть подсказки.
 */
export function emptyParts(
	parts: TDateInputParts,
	typed: string,
	format: IDateFieldFormat,
): boolean {
	return typed === '' && format.parts.every((part) => parts[part.type] === undefined)
}

/** Пуста ли часть: ни числа, ни набранного (`typed`) — она показывает подсказку. */
export function emptyPart(parts: TDateInputParts, typed: string, part: TFieldPart): boolean {
	return parts[part.type] === undefined && typed === ''
}

/** Одинаковы ли части — все, и те, которых нет в формате. */
export function sameParts(a: TDateInputParts, b: TDateInputParts): boolean {
	const left = definedEntries(a)
	const right = new Map(definedEntries(b))

	return left.length === right.size && left.every(([type, value]) => right.get(type) === value)
}

/** Число части, которое видит пользователь; пустая — `undefined`. */
export function shownOf(parts: TDateInputParts, part: TFieldPart): number | undefined {
	const value = parts[part.type]

	return value === undefined ? undefined : part.rule.shown(value)
}

/**
 * Текст части: есть число — по правилу части; числа нет — набранное
 * (`typed`: нули, с которых часть не начинается); нет ничего — подсказка.
 */
export function textOf(parts: TDateInputParts, typed: string, part: TFieldPart): string {
	const shown = shownOf(parts, part)

	if (shown !== undefined) return part.rule.text(shown)
	if (typed !== '') return part.rule.typedText(typed)

	return part.rule.placeholder
}

/**
 * Знак в часть: знак без числа снимает число части — ноль поверх «12»
 * начинает её заново. Знак не этой части — `undefined`.
 */
export function enterKey(
	parts: TDateInputParts,
	typed: string,
	part: TFieldPart,
	key: string,
	validate: boolean,
): TKeyEntry | undefined {
	const entry = part.rule.enter(parts, typed, key, validate)

	if (entry === undefined) return undefined

	const value = entry.shown === undefined ? undefined : part.rule.stored(entry.shown, parts)

	return { parts: withPart(parts, part, value), typed: entry.typed, advance: entry.advance }
}

/**
 * Backspace в части. У части без числа стирается набранный ноль; пустой —
 * ни числа, ни набранного — стирать нечего: `undefined`.
 */
export function erasePart(
	parts: TDateInputParts,
	typed: string,
	part: TFieldPart,
): TDigitErase | undefined {
	if (emptyPart(parts, typed, part)) return undefined

	const shown = shownOf(parts, part)

	if (shown === undefined) return { parts, typed: typed.slice(0, -1) }

	const erased = part.rule.erase(shown)
	const value = erased.shown === undefined ? undefined : part.rule.stored(erased.shown, parts)

	return { parts: withPart(parts, part, value), typed: erased.typed }
}

/**
 * Шаг ↑/↓ части на `count` — по правилу части. Пустая часть шаг не делает, а
 * начинает с числа текущего момента `now`.
 */
export function stepPart(
	parts: TDateInputParts,
	part: TFieldPart,
	count: number,
	now: TDateInputParts,
): TDateInputParts {
	const { rule } = part
	const { min, max } = rule.limits(parts)
	const shown = shownOf(parts, part)
	const next =
		shown === undefined
			? clamp(shownOf(now, part) ?? min, min, max)
			: rule.step(shown + Math.round(count), min, max)

	return withPart(parts, part, rule.stored(next, parts))
}

/** Home/End: часть — к краю своего хода. */
export function partAtEdge(
	parts: TDateInputParts,
	part: TFieldPart,
	edge: TDateInputEdge,
): TDateInputParts {
	const { min, max } = part.rule.limits(parts)

	return withPart(parts, part, part.rule.stored(edge === 'start' ? min : max, parts))
}

/** Записи частей с числом. */
function definedEntries(parts: TDateInputParts): [string, number][] {
	return Object.entries(parts).flatMap(([type, value]) =>
		value === undefined ? [] : [[type, value]],
	)
}
