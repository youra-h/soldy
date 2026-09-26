import type { TInlineSpan } from './types'

/**
 * Замер области прокрутки для доводки элемента под фокусом (`nearestShift`):
 * окно области и элемент области, в котором лежит узел.
 *
 * Живёт в общих утилитах, а не у ленты: мерят двое — вьюпорт ленты
 * (`TScrollerViewportPlugin`) и ряд тегов `scroll` (`TTagsScrollPlugin`).
 * Свой замер у второго разошёлся бы с первым — например, в том, чем считать
 * процент у `scroll-padding` и что делать с `auto`.
 */

/**
 * Окно области по строке: паддинг-бокс (`clientLeft`, `clientWidth` — без
 * рамки и полосы прокрутки) без вычисленного `scroll-padding` с каждой
 * стороны. Стороны физические: логический `scroll-padding-inline` браузер
 * отдаёт уже разложенным по ним.
 *
 * Отступ окна задаёт тема, и только она знает, сколько места держать у края:
 * ширину подсказки ленты, запас под кольцо фокуса. До того же окна докручивает
 * и сам браузер (`scrollIntoView`, фокус), поэтому доводка с ним не спорит.
 */
export function scrollWindowOf(area: Element, style: CSSStyleDeclaration): TInlineSpan {
	const left = area.getBoundingClientRect().left + area.clientLeft
	const width = area.clientWidth

	return {
		left: left + insetOf(style.scrollPaddingLeft, width),
		right: left + width - insetOf(style.scrollPaddingRight, width),
	}
}

/**
 * Отступ окна с одной стороны, в px. Процент считается от ширины области
 * прокрутки. `auto` спецификация оставляет браузеру и советует ноль — ноль и
 * считается.
 */
function insetOf(value: string, width: number): number {
	const length = parseFloat(value)

	if (!Number.isFinite(length)) return 0

	return value.endsWith('%') ? (length * width) / 100 : length
}

/**
 * Элемент области, в котором лежит узел, — его предок, который прямой ребёнок
 * области. Содержимое лежит в области без обёрток: у ленты это элементы, на
 * которых тема ставит точки снапа, у ряда тегов — пилюли.
 */
export function itemOf(node: Element, area: Element): Element {
	let item = node

	while (item.parentElement !== null && item.parentElement !== area) {
		item = item.parentElement
	}

	return item
}
