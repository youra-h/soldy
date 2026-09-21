/**
 * Окно как граница раскладки — общее для спеков, которые смотрят на
 * телепортированные панели (`tags-overflow.spec.ts`, `select-tags.spec.ts`).
 *
 * Граница здесь — `window.innerWidth` и `window.innerHeight`: ровно то, по
 * чему считают сдвиг и flip у `TAnchorPlugin`
 * (`plugins/src/custom/frame/anchor/anchor.plugin.ts`). Видимая область бывает
 * уже — полосу прокрутки `innerWidth` считает своей, — и у самого края панель
 * заезжает под неё. Это про сам плагин, а не про панель, и правится отдельно
 * (869f4puaa); до тех пор спеки сторожат то, что он обещает сегодня, а не то,
 * что хотелось бы видеть.
 *
 * Одна копия на всех, как у `colors.ts`: разойдись две, один спек молча
 * сторожил бы другую границу.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/** Прямоугольник узла целиком внутри окна — ни одной стороной за краем. */
export const expectInsideWindow = (element: Element, what: string): void => {
	const box = element.getBoundingClientRect()

	expect(box.left, `${what}: левый край`).toBeGreaterThanOrEqual(-EPSILON)
	expect(box.top, `${what}: верх`).toBeGreaterThanOrEqual(-EPSILON)
	expect(box.right, `${what}: правый край`).toBeLessThanOrEqual(window.innerWidth + EPSILON)
	expect(box.bottom, `${what}: низ`).toBeLessThanOrEqual(window.innerHeight + EPSILON)
}
