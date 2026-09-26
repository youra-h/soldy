/**
 * Подсказка у края — маска, которой лента и ряд тегов растворяют содержимое
 * там, где за краем есть ещё, — как её видит браузер. Общее для спеков, которые
 * проверяют, что элемент под фокусом не остаётся под подсказкой
 * (`scroller.spec.ts`, `tags-overflow.spec.ts`, `select-tags.spec.ts`).
 *
 * Меряется вычисленная маска, а не переменные темы: так видно то, что видит
 * пользователь, и проверка не знает ни имён переменных, ни ширины подсказки.
 * Маска одной формы у вьюпорта ленты (`scroller/_scroller.scss`) и у ряда
 * `scroll` в поле Select (`tags/_tags.scss`), поэтому и разбор один.
 *
 * Одна копия на всех, как у `viewport.ts`: разойдись две, один спек молча
 * сторожил бы другую маску.
 */

import { expect } from 'vitest'

/** Допуск на субпиксельное округление координат. */
const EPSILON = 0.5

/**
 * Маска подсказки, как её отдаёт браузер: градиент по строке в четыре
 * ступени — прозрачное у края, непрозрачное со второй ступени по третью и
 * снова прозрачное у другого края.
 */
const FADE_MASK = new RegExp(
	[
		String.raw`^linear-gradient\(to (?<to>left|right)`,
		String.raw`rgba\(0, 0, 0, 0\) 0px`,
		String.raw`rgb\(0, 0, 0\) (?<from>[\d.]+)px`,
		String.raw`rgb\(0, 0, 0\) (?:100%|calc\(100% - (?<until>[\d.]+)px\))`,
		String.raw`rgba\(0, 0, 0, 0\) 100%\)$`,
	].join(', '),
)

/**
 * Сколько гаснет у левого и у правого края узла — по вычисленной маске.
 *
 * У края, от которого идёт градиент, гаснет до второй ступени, у другого —
 * сколько третьей не хватает до 100%. Направление градиента переводит их в
 * левый и правый край: в RTL маска развёрнута.
 */
export const fades = (element: Element): { left: number; right: number } => {
	const mask = getComputedStyle(element).maskImage
	const stops = FADE_MASK.exec(mask)?.groups

	if (!stops) throw new Error(`маска подсказки не разобрана: ${mask}`)

	const from = Number(stops.from)
	const until = stops.until ? Number(stops.until) : 0

	return stops.to === 'right' ? { left: from, right: until } : { left: until, right: from }
}

/**
 * Узел лежит в чистой части контейнера: ни одним краем не заходит под
 * подсказку. Чистая часть — прямоугольник контейнера без того, что сейчас
 * гаснет у каждого края: маска считается от его рамки, как и прямоугольник.
 */
export const expectClearOfFades = (element: Element, container: Element, what: string): void => {
	const bounds = container.getBoundingClientRect()
	const fade = fades(container)
	const box = element.getBoundingClientRect()

	expect(box.left, `${what}: левый край`).toBeGreaterThanOrEqual(
		bounds.left + fade.left - EPSILON,
	)
	expect(box.right, `${what}: правый край`).toBeLessThanOrEqual(
		bounds.right - fade.right + EPSILON,
	)
}

/**
 * Фокус на узле, и узел лежит в чистой части контейнера — сторож «элемент под
 * фокусом не остаётся под подсказкой».
 *
 * Годится он только для узла уже чистой части: более широкий не встанет в неё
 * ни при каком решении. Поэтому ширина проверяется первой — иначе такой узел
 * читался бы как ошибка доводки, а не как неверно подобранный тест.
 */
export const expectFocusedClearOfFades = (
	element: Element,
	container: Element,
	what: string,
): void => {
	const fade = fades(container)
	const clear = container.getBoundingClientRect().width - fade.left - fade.right

	expect(document.activeElement, `${what}: фокус`).toBe(element)
	expect(element.getBoundingClientRect().width, `${what} уже чистой части`).toBeLessThan(clear)

	expectClearOfFades(element, container, what)
}
