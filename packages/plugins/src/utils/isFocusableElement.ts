/**
 * Узел, которому можно дать и снять фокус: `focus()` и `blur()` есть у
 * `HTMLElement` и у `SVGElement`.
 *
 * `SVGElement` здесь не для полноты: корнем компонента бывает `svg`, и
 * сужение до одного `HTMLElement` молча отняло бы у него фокус.
 */
export function isFocusableElement(el: unknown): el is HTMLElement | SVGElement {
	return el instanceof HTMLElement || el instanceof SVGElement
}
