import { isMeasurableElement } from './isMeasurableElement'

/** Ось прокрутки: `x` — вдоль строки, `y` — вдоль страницы. */
export type TScrollAxis = 'x' | 'y'

/**
 * Прокручивается ли узел вдоль оси: стиль разрешает прокрутку (`auto`,
 * `scroll`), и содержимое в окно узла не помещается.
 */
export function isScrollable(element: Element, axis: TScrollAxis): boolean {
	if (!isMeasurableElement(element)) return false

	const style = getComputedStyle(element)
	const overflow = axis === 'y' ? style.overflowY : style.overflowX
	const overflows =
		axis === 'y'
			? element.scrollHeight > element.clientHeight
			: element.scrollWidth > element.clientWidth

	return (overflow === 'auto' || overflow === 'scroll') && overflows
}

/**
 * Ближайший предок узла, который прокручивается вдоль оси. Такого нет —
 * `null`: узел прокручивает страница.
 */
export function scrollParentOf(node: Element, axis: TScrollAxis): HTMLElement | null {
	for (let current = node.parentElement; current; current = current.parentElement) {
		if (isScrollable(current, axis)) return current
	}

	return null
}
