/**
 * Откуда растёт значение — сторона хода, у которой `min`.
 *
 * Одно понятие на указатель и клавиатуру (`SlideDirection` у Radix): ось,
 * вычисленное направление письма и `inverted` сводятся в него один раз, и
 * дальше плагины о них не спрашивают. По нему указатель переводит точку в
 * долю хода, а клавиатура решает, какая стрелка ведёт к `min`.
 */
export type TSlideDirection = 'from-left' | 'from-right' | 'from-bottom' | 'from-top'

/** Точка указателя в координатах окна — то, что есть у `PointerEvent`. */
export type TSlidePoint = {
	clientX: number
	clientY: number
}
