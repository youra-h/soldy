/**
 * Направление письма вокруг блока — общее для спеков, которые смотрят, как
 * тема зеркалит то, у чего логических направлений нет: стрелки ленты и
 * календаря, маску подсказки у ленты и у ряда тегов в поле, бег полосы и
 * выезд панели (`scroller.spec.ts`, `calendar.spec.ts`,
 * `progress-linear.spec.ts`, `drawer.spec.ts`, `select-tags.spec.ts`).
 *
 * Знак строки тема берёт у ближайшего `dir` (`themes/oren/src/direction.css`)
 * — у того же, по которому браузер раскладывает логические свойства. Раньше
 * она смотрела на атрибут у любого предка, и блок с `direction="ltr"` в
 * RTL-предке или в `<div dir="ltr">` на RTL-странице получал зеркало RTL:
 * раскладка — LTR, а стрелки, маска, бег и выезд — RTL. Поэтому к случаям LTR
 * и RTL добавлены вложенные, где решает ближайший `dir`, а не первый
 * попавшийся с `rtl`.
 *
 * Одна копия на всех, как у `fades.ts`: разойдись две, один спек молча
 * сторожил бы другой набор случаев.
 */

export type TLine = 'ltr' | 'rtl'

/** Сторона экрана. */
export type TSide = 'left' | 'right'

export type TDirectionCase = {
	name: string
	/** `dir` страницы — у `<html>`; нет его — направления у страницы нет. */
	page?: TLine
	/** `dir` предка блока — узла, внутри которого он стоит. */
	ancestor?: TLine
	/** Проп `direction` блока — он пишет `dir` корню. */
	direction?: TLine
	/** Направление строки блока — по ближайшему `dir`. */
	line: TLine
}

export const DIRECTION_CASES: readonly TDirectionCase[] = [
	{ name: 'LTR', line: 'ltr' },
	{ name: 'RTL-страница', page: 'rtl', line: 'rtl' },
	{ name: 'RTL у предка', ancestor: 'rtl', line: 'rtl' },
	{ name: 'RTL пропом direction', direction: 'rtl', line: 'rtl' },
	{ name: 'LTR пропом direction в RTL-предке', ancestor: 'rtl', direction: 'ltr', line: 'ltr' },
	{ name: 'LTR-предок на RTL-странице', page: 'rtl', ancestor: 'ltr', line: 'ltr' },
	{ name: 'RTL-предок на LTR-странице', page: 'ltr', ancestor: 'rtl', line: 'rtl' },
]

/** Края строки на экране: где её начало и где конец. */
export const sidesOf = (line: TLine): { start: TSide; end: TSide } =>
	line === 'ltr' ? { start: 'left', end: 'right' } : { start: 'right', end: 'left' }

/**
 * `dir` узла; без направления атрибут снимается. Страница — `<html>`, а
 * предок панели, которая уходит телепортом в `body`, — сам `body`.
 */
export const setDir = (element: HTMLElement, line?: TLine): void => {
	if (line) element.dir = line
	else element.removeAttribute('dir')
}

/**
 * Куда смотрит стрелка кнопки — по зеркалу её иконки; кнопка — селектором CSS.
 * Роль в контракте иконок одна, `arrowRight`, а стрелку в другую сторону тема
 * зеркалит по оси X: отрицательный масштаб — стрелка смотрит влево.
 */
export const pointing = (button: string): TSide => {
	// Иконка — `svg`, а не HTML-узел
	const icon = document.querySelector(`${button} .s-icon`)

	if (!icon) throw new Error(`${button}: иконки нет`)

	return new DOMMatrix(getComputedStyle(icon).transform).a < 0 ? 'left' : 'right'
}
