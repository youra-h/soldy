const HOST_STYLE = ':host { display: contents }'

/**
 * Элемент без своей коробки: теневой корень несёт только `<slot>` и правило
 * `:host`, содержимое остаётся светом, а `display` потребителя главнее.
 */
export function displayContents(element: HTMLElement): void {
	const { ownerDocument } = element
	const style = ownerDocument.createElement('style')

	style.textContent = HOST_STYLE
	element.attachShadow({ mode: 'open' }).append(style, ownerDocument.createElement('slot'))
}
