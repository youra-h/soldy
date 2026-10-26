/**
 * Building the DOM of a page by code, as an application without a framework
 * does: attributes as attributes, properties as properties, children in order.
 */
type TChild = Node | string

export function h(
	tag: string,
	attributes: Readonly<Record<string, string | boolean>> = {},
	children: readonly TChild[] = [],
	props: Readonly<Record<string, unknown>> = {},
): HTMLElement {
	const node = document.createElement(tag)

	for (const [name, value] of Object.entries(attributes)) {
		if (value === true) node.setAttribute(name, '')
		else if (value !== false) node.setAttribute(name, value)
	}

	for (const [name, value] of Object.entries(props)) Reflect.set(node, name, value)

	node.append(...children)

	return node
}

/** A soldy element on a native tag — `<button is="so-button">` — with its props as properties. */
export function so(
	tag: string,
	is: string,
	props: Readonly<Record<string, unknown>> = {},
	children: readonly TChild[] = [],
): HTMLElement {
	const node = document.createElement(tag, { is })

	for (const [name, value] of Object.entries(props)) Reflect.set(node, name, value)

	node.append(...children)

	return node
}

/** A node into a named slot. */
export function slotted<T extends Element>(node: T, slot: string): T {
	node.setAttribute('slot', slot)

	return node
}

/** A copy with several roots — a fragment: the trigger and the panel side by side. */
export function fragment(...children: TChild[]): DocumentFragment {
	const node = document.createDocumentFragment()

	node.append(...children)

	return node
}
