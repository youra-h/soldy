/**
 * Узел в тени элемента — цепочкой «селектор документа, затем селекторы в тенях»:
 * у таблиц на Web Components чекбокс «выбрать все» и кнопка сортировки лежат в
 * теневом дереве, и селектор документа до них не достаёт.
 */
export function inShadow(selector: string, ...inner: string[]): HTMLElement {
	let node: Element | null = document.querySelector(selector)

	for (const step of inner) node = node?.shadowRoot?.querySelector(step) ?? null
	if (!(node instanceof HTMLElement)) throw new Error(`нет ${[selector, ...inner].join(' → ')}`)

	return node
}
