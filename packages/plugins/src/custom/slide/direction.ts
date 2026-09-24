import type { ISlidable } from '@soldy-ui/core'
import type { TSlideDirection, TSlidePoint } from './types'

/**
 * Направление роста значения у владельца.
 *
 * Горизонталь растёт от начала строки, поэтому в RTL — справа; `inverted`
 * переворачивает сторону. Вертикаль растёт снизу вверх при любом направлении
 * письма. Направление письма — вычисленное, а не `direction` компонента: у
 * того бывает `inherit`, и тогда сторону задаёт предок.
 */
export function slideDirection(
	owner: Pick<ISlidable, 'orientation' | 'inverted'>,
	element: Element,
): TSlideDirection {
	if (owner.orientation === 'vertical') return owner.inverted ? 'from-top' : 'from-bottom'

	const rtl = getComputedStyle(element).direction === 'rtl'

	return rtl === owner.inverted ? 'from-left' : 'from-right'
}

/** Путь от стороны `min` до точки и длина хода — по оси направления. */
const ALONG: Record<
	TSlideDirection,
	(box: DOMRectReadOnly, point: TSlidePoint) => [offset: number, length: number]
> = {
	'from-left': (box, point) => [point.clientX - box.left, box.width],
	'from-right': (box, point) => [box.right - point.clientX, box.width],
	'from-bottom': (box, point) => [box.bottom - point.clientY, box.height],
	'from-top': (box, point) => [point.clientY - box.top, box.height],
}

/**
 * Доля хода в точке указателя по коробке дорожки: 0 — у `min`, 1 — у `max`,
 * за краями — край. Коробка дорожки — ход центров ручек, её края и есть 0 и
 * 1 (контракт с темой). Коробка нулевой длины — начало хода.
 */
export function fractionAt(
	direction: TSlideDirection,
	box: DOMRectReadOnly,
	point: TSlidePoint,
): number {
	const [offset, length] = ALONG[direction](box, point)

	return length > 0 ? Math.min(1, Math.max(0, offset / length)) : 0
}

/**
 * Стрелки к `min` для каждого направления роста (таблица `BACK_KEYS` у
 * Radix); две остальные ведут к `max`. Стрелки своей оси двигают ручку туда,
 * куда смотрят. Стрелки чужой оси — как в любом поле с числом: ↑ и →
 * прибавляют; исключение — вертикаль сверху вниз, где ↓ прибавляет, потому что
 * туда уходит и ручка.
 */
const BACK_KEYS: Record<TSlideDirection, readonly string[]> = {
	'from-left': ['ArrowLeft', 'ArrowDown'],
	'from-right': ['ArrowRight', 'ArrowDown'],
	'from-bottom': ['ArrowDown', 'ArrowLeft'],
	'from-top': ['ArrowUp', 'ArrowLeft'],
}

const ARROWS: ReadonlySet<string> = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

/** Шаг от стрелки: `1` — к `max`, `-1` — к `min`; не стрелка — `null`. */
export function arrowStep(direction: TSlideDirection, key: string): 1 | -1 | null {
	if (!ARROWS.has(key)) return null

	return BACK_KEYS[direction].includes(key) ? -1 : 1
}
