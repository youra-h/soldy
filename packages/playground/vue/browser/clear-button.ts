/**
 * Кнопка очистки поля — квадрат со стороной в строку слота: так её рисует
 * тема (`themes/oren/src/components/input/_mixins.scss`, `field-clear`) у
 * Input, у DateInput и в поле Select. Раньше ширину кнопке давал паддинг
 * шкалы Button, а высоту резал `max-h-full`: на крупных размерах очистка
 * Select выходила низкой и широкой.
 *
 * Строку слота даёт обёртка слота у конца поля — её высота и есть строка.
 * Иконка обязана уместиться в кнопку: размер у неё свой, по шкале.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

export function expectClearSquare(button: Element, slot: Element, label: string): void {
	const own = button.getBoundingClientRect()
	const row = slot.getBoundingClientRect()
	const icon = button.querySelector('svg')

	expect(row.height, `${label}: строка слота`).toBeGreaterThan(0)
	expect(Math.abs(own.height - row.height), `${label}: высота — строка слота`).toBeLessThan(
		EPSILON,
	)
	expect(Math.abs(own.width - own.height), `${label}: квадрат`).toBeLessThan(EPSILON)

	if (!icon) throw new Error(`${label}: иконки нет`)

	const glyph = icon.getBoundingClientRect()

	expect(glyph.width, `${label}: иконка не схлопнулась`).toBeGreaterThan(0)
	expect(glyph.left, `${label}: иконка внутри слева`).toBeGreaterThanOrEqual(own.left - EPSILON)
	expect(glyph.right, `${label}: иконка внутри справа`).toBeLessThanOrEqual(own.right + EPSILON)
	expect(glyph.top, `${label}: иконка внутри сверху`).toBeGreaterThanOrEqual(own.top - EPSILON)
	expect(glyph.bottom, `${label}: иконка внутри снизу`).toBeLessThanOrEqual(own.bottom + EPSILON)
}
