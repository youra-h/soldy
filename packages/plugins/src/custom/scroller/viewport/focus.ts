/**
 * Доводка элемента под фокусом — чистая функция, без DOM.
 *
 * Плагин рядом только читает у вьюпорта окно снапа и два прямоугольника, а
 * весь счёт здесь. Отсюда и проверяемость, как у `edges.ts`: RTL, субпиксели и
 * элемент шире окна проверяются числами, а не настоящей раскладкой.
 */

import type { TFocusShiftOptions, TInlineSpan } from './types'

/**
 * Допуск на субпиксельное округление: край, вышедший из окна на полпикселя, —
 * ещё в окне. Лента встаёт на целый пиксель, а края элементов дробные.
 */
const TOLERANCE = 0.5

const width = (span: TInlineSpan): number => span.right - span.left

/**
 * Сдвиги ленты, при которых отрезок лежит в окне, а если он шире окна — накрывает
 * его: больше окна от него не увидеть. Сдвиг — как у `scrollBy`: на сколько
 * лента со всем содержимым уезжает влево.
 */
function fitting(span: TInlineSpan, snapport: TInlineSpan): [number, number] {
	const left = span.left - snapport.left
	const right = span.right - snapport.right

	return [Math.min(left, right), Math.max(left, right)]
}

/**
 * На сколько сдвинуть ленту, чтобы элемент под фокусом встал в окно снапа, —
 * или `null`, если он уже там.
 *
 * Сдвиг ведёт к точке снапа его элемента ленты, а не просто к краю окна: снап
 * действует и на программную прокрутку и вернул бы ленту к соседней точке.
 * Элемент ленты не шире окна — точка одна: его начало у начала окна, и сам
 * он тогда в окне целиком. Шире окна — точка снапа любое положение, где он
 * накрывает окно (так их считает и сам снап). Из них берётся ближайшее, при
 * котором элемент под фокусом в окне: с одним «начало к началу» крестик в
 * конце длинного тега остался бы за краем.
 *
 * Элемент под фокусом шире окна в него не встанет ни при каком сдвиге и
 * доводится до ближайшего положения, где накрывает окно: больше окна от него
 * всё равно не увидеть.
 */
export function resolveFocusShift({
	snapport,
	focused,
	item,
	rtl,
}: TFocusShiftOptions): number | null {
	const [from, to] = fitting(focused, snapport)

	if (from - TOLERANCE <= 0 && to + TOLERANCE >= 0) return null

	if (width(item) <= width(snapport)) {
		return rtl ? item.right - snapport.right : item.left - snapport.left
	}

	const [snapFrom, snapTo] = fitting(item, snapport)

	return Math.min(Math.max(0, from, snapFrom), to, snapTo)
}
