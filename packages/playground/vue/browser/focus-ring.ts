/**
 * Кольцо фокуса внутри прокручиваемой области — общее для спеков ряда тегов
 * `scroll` (`select-tags.spec.ts`, `tags-overflow.spec.ts`).
 *
 * Кольцо Button — `outline` за прямоугольником элемента: толщина плюс отступ.
 * Прокручиваемая область режет всё, что вышло за её паддинг-бокс, а в
 * раскладке кольца нет — срезанное, его видно только по геометрии: где
 * элемент, насколько за него выходит кольцо и где кончается область.
 *
 * Одна копия на всех, как у `viewport.ts`: разойдись две, один спек молча
 * мерил бы кольцо или область иначе.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/**
 * Прокручиваемая область узла по вертикали — его паддинг-бокс: без рамки
 * (`clientTop`) и без полосы прокрутки, которую `clientHeight` не считает.
 */
const scrollArea = (element: Element) => {
	const top = element.getBoundingClientRect().top + element.clientTop

	return { top, bottom: top + element.clientHeight }
}

/**
 * Кольцо фокуса узла не срезано сверху и снизу: по вертикали оно целиком
 * внутри прокручиваемой области `area`.
 *
 * Сперва — что кольцо есть. У фокуса не с клавиатуры его нет вовсе, и
 * проверка ниже прошла бы вхолостую при любой обрезке.
 */
export const expectRingInsideVertically = (focused: Element, area: Element, what: string): void => {
	const { outlineStyle, outlineWidth, outlineOffset } = getComputedStyle(focused)
	const width = parseFloat(outlineWidth)

	expect(outlineStyle, `${what}: кольцо`).not.toBe('none')
	expect(width, `${what}: толщина кольца`).toBeGreaterThan(0)

	const ring = width + parseFloat(outlineOffset)
	const { top, bottom } = focused.getBoundingClientRect()
	const clip = scrollArea(area)

	expect(top - ring, `${what}: верх кольца`).toBeGreaterThanOrEqual(clip.top - EPSILON)
	expect(bottom + ring, `${what}: низ кольца`).toBeLessThanOrEqual(clip.bottom + EPSILON)
}
