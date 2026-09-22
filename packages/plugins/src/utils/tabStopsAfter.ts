import { tabStops } from './tabStops'

/**
 * Остановки после узла в порядке документа — без его потомков и без
 * `exclude`: Tab из телепортированной панели ведёт к тому, что стоит в
 * документе за триггером, а сама панель лежит в конце `body`.
 *
 * Спрашивает об этом немодальный оверлей: у модального Tab замкнут в панели,
 * и что стоит за ней, его не касается. Список остановок берётся у `tabStops`
 * — второй набор селекторов разошёлся бы с первым.
 */
export function tabStopsAfter(node: Element, exclude: Element | null): Element[] {
	return tabStops(node.ownerDocument).filter(
		(stop) =>
			!node.contains(stop) &&
			!exclude?.contains(stop) &&
			(node.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
	)
}
