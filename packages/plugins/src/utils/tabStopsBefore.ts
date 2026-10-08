import { tabStops } from './tabStops'

/**
 * Остановки перед узлом в порядке документа — без его потомков: Shift+Tab из
 * виджета, который водит Tab сам, ведёт к тому, что стоит в документе перед
 * ним. Предок узла с остановкой — тоже перед ним: в порядке Tab он раньше
 * своих потомков.
 *
 * Пара к `tabStopsAfter`, и список остановок тот же — у `tabStops`: второй
 * набор селекторов разошёлся бы с первым. Спрашивает сетка таблицы: её Tab —
 * одна остановка, и уходит он из неё сам.
 */
export function tabStopsBefore(node: Element): Element[] {
	return tabStops(node.ownerDocument).filter(
		(stop) =>
			!node.contains(stop) &&
			(node.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_PRECEDING) !== 0,
	)
}
