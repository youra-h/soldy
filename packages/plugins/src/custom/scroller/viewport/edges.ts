/**
 * Края ленты — чистая функция, без DOM.
 *
 * Весь счёт здесь, а плагин рядом только читает у вьюпорта три числа. Отсюда
 * и проверяемость: дробные ширины, зум и RTL проверяются числами, а не
 * настоящей раскладкой.
 */

/** Три числа, которые вьюпорт знает о себе сам. */
export type TEdgesOptions = {
	/**
	 * Положение ленты в системе координат браузера.
	 *
	 * В RTL оно отрицательное: начало строки — правый край, и от него лента
	 * уезжает влево. Поэтому знак здесь не значим, значим модуль — расстояние
	 * от логического начала.
	 */
	scrollLeft: number
	/** Видимая ширина вьюпорта — она же шаг листания. */
	clientWidth: number
	/** Полная ширина содержимого. */
	scrollWidth: number
}

/** Есть ли куда листать в каждую сторону. */
export type TScrollerEdges = {
	canPrev: boolean
	canNext: boolean
}

/**
 * Допуск в пиксель.
 *
 * `scrollLeft + clientWidth === scrollWidth` на дробных ширинах и при зуме не
 * сходится: браузер округляет `clientWidth` и `scrollWidth` до целых, а
 * `scrollLeft` отдаёт дробным. Без допуска кнопка «вперёд» на самом краю не
 * гасла бы, а лента доезжала бы до «ещё чуть-чуть» без движения.
 */
const TOLERANCE = 1

/**
 * Края ленты по замеру вьюпорта.
 *
 * Нулевая видимая ширина — это «раскладки ещё нет», а не «листать некуда»:
 * до первой раскладки все три числа нули, и «вперёд» нечему включать.
 */
export function resolveEdges({
	scrollLeft,
	clientWidth,
	scrollWidth,
}: TEdgesOptions): TScrollerEdges {
	if (clientWidth <= 0) return { canPrev: false, canNext: false }

	const offset = Math.abs(scrollLeft)

	return {
		canPrev: offset > TOLERANCE,
		canNext: offset + clientWidth < scrollWidth - TOLERANCE,
	}
}
