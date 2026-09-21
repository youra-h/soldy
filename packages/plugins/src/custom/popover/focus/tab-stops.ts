import { isFocusableElement, tabStops } from '../../../utils'

/**
 * Переходы фокуса модели немодального диалога поверх общих остановок Tab.
 *
 * Сам список остановок — `tabStops` в `utils`: его спрашивает не только
 * поповер (лента решает по нему, становиться ли ей остановкой сама), и вторая
 * копия селекторов разошлась бы с первой.
 */

/**
 * Остановки после узла в порядке документа — без его потомков и без
 * `exclude`: Tab из телепортированной панели ведёт к тому, что стоит в
 * документе за триггером, а сама панель лежит в конце `body`.
 */
export function tabStopsAfter(node: Element, exclude: Element | null): Element[] {
	return tabStops(node.ownerDocument).filter(
		(stop) =>
			!node.contains(stop) &&
			!exclude?.contains(stop) &&
			(node.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
	)
}

/**
 * Ставит фокус на первого кандидата, который его принял, и говорит, нашёлся
 * ли такой. Скрытый, выключенный или отсоединённый элемент фокус не
 * принимает — его пропускают.
 */
export function focusFirst(candidates: readonly Element[]): boolean {
	for (const candidate of candidates) {
		if (!isFocusableElement(candidate)) continue

		candidate.focus()

		if (candidate.ownerDocument.activeElement === candidate) return true
	}

	return false
}
