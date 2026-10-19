/**
 * Кнопка шага поля числа и её узел: `direction` — куда она шагает, `1` —
 * «больше», `-1` — «меньше».
 */
export type TNumberInputButton = {
	readonly direction: 1 | -1
	readonly element: Element
}
