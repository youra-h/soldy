/**
 * Узел с layout-боксом: `offsetWidth`/`offsetHeight`/`offsetTop`/`offsetLeft`
 * и инлайновый `style`.
 *
 * Узел плагину приходит как `Element` (см. `TElementPlugin`) — корнем
 * компонента может оказаться `svg`. Там, где меряется бокс или пишется
 * инлайновый стиль, узел сужается этим гардом, а не приведением: у
 * `SVGElement` нет `offset*`, и приведение отдало бы `undefined` в
 * арифметику.
 */
export function isMeasurableElement(el: unknown): el is HTMLElement {
	return el instanceof HTMLElement
}
