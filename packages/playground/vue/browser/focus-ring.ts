/**
 * Кольцо фокуса внутри обрезающей области — общее для спеков ряда тегов
 * (`select-tags.spec.ts`, `tags-overflow.spec.ts`).
 *
 * Кольцо Button — `outline` за прямоугольником элемента: толщина плюс отступ.
 * Обрезающая область режет всё, что вышло за край обрезки, а в раскладке
 * кольца нет — срезанное, его видно только по геометрии: где элемент,
 * насколько за него выходит кольцо и где проходит край обрезки.
 *
 * Край обрезки — паддинг-бокс области. Прокручиваемая область режет ровно по
 * нему. `overflow: clip` режет дальше него на `overflow-clip-margin`, но
 * Chromium применяет запас, только когда `clip` по обеим осям: с одной осью
 * кольцо срезалось, как без запаса. Ось, по которой область не режет вовсе
 * (`visible`), кольца не срезает.
 *
 * Одна копия на всех, как у `viewport.ts`: разойдись две, один спек молча
 * мерил бы кольцо или область иначе.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

type TAxis = 'x' | 'y'

/** Отрезок по оси. */
type TSpan = { start: number; end: number }

/** Отрезок прямоугольника по оси. */
const spanOf = (box: DOMRect, axis: TAxis): TSpan =>
	axis === 'x' ? { start: box.left, end: box.right } : { start: box.top, end: box.bottom }

/**
 * Запас обрезки в пикселях — насколько край обрезки дальше паддинг-бокса.
 * Действует, только когда `clip` по обеим осям (см. шапку).
 */
const clipMargin = (style: CSSStyleDeclaration): number => {
	if (style.overflowX !== 'clip' || style.overflowY !== 'clip') return 0

	const margin = /^(?<pixels>[\d.]+)px$/.exec(style.overflowClipMargin)?.groups?.pixels

	// Запас от другого бокса (`content-box 4px`) здесь не разбирается: мерить
	// его от паддинг-бокса значило бы мерить не то
	if (margin === undefined) {
		throw new Error(`запас обрезки не разобран: ${style.overflowClipMargin}`)
	}

	return Number(margin)
}

/**
 * Край обрезки области по оси; `null` — по этой оси она не режет.
 *
 * Паддинг-бокс — без рамки (`clientLeft`, `clientTop`) и без полосы
 * прокрутки, которую `clientWidth` и `clientHeight` не считают.
 */
const clipEdge = (area: Element, axis: TAxis): TSpan | null => {
	const style = getComputedStyle(area)

	if ((axis === 'x' ? style.overflowX : style.overflowY) === 'visible') return null

	const box = area.getBoundingClientRect()
	const start = axis === 'x' ? box.left + area.clientLeft : box.top + area.clientTop
	const size = axis === 'x' ? area.clientWidth : area.clientHeight
	const margin = clipMargin(style)

	return { start: start - margin, end: start + size + margin }
}

/**
 * Кольцо фокуса узла по оси целиком внутри края обрезки области `area`.
 *
 * Сперва — что кольцо есть. У фокуса не с клавиатуры его нет вовсе, и
 * проверка ниже прошла бы вхолостую при любой обрезке.
 */
const expectRingInside = (
	focused: Element,
	area: Element,
	what: string,
	axis: TAxis,
	[before, after]: [string, string],
): void => {
	const { outlineStyle, outlineWidth, outlineOffset } = getComputedStyle(focused)
	const width = parseFloat(outlineWidth)

	expect(outlineStyle, `${what}: кольцо`).not.toBe('none')
	expect(width, `${what}: толщина кольца`).toBeGreaterThan(0)

	const clip = clipEdge(area, axis)

	if (!clip) return

	const ring = width + parseFloat(outlineOffset)
	const { start, end } = spanOf(focused.getBoundingClientRect(), axis)

	expect(start - ring, `${what}: ${before} кольца`).toBeGreaterThanOrEqual(clip.start - EPSILON)
	expect(end + ring, `${what}: ${after} кольца`).toBeLessThanOrEqual(clip.end + EPSILON)
}

/** Кольцо фокуса узла не срезано сверху и снизу. */
export const expectRingInsideVertically = (focused: Element, area: Element, what: string): void =>
	expectRingInside(focused, area, what, 'y', ['верх', 'низ'])

/** Кольцо фокуса узла не срезано слева и справа. */
export const expectRingInsideHorizontally = (focused: Element, area: Element, what: string): void =>
	expectRingInside(focused, area, what, 'x', ['левый край', 'правый край'])
