import type { Component, JSX } from 'solid-js'
import { render } from 'solid-js/web'

/** The library's setup module: the provider a page of the library is wrapped in. */
export interface ISolidSetup {
	Root: Component<{ children?: JSX.Element }>
}

/**
 * `count` copies of a page under one Solid root wrapped in the library's
 * provider — as the soldy host does it: the copies are built once, in the body
 * of the root. Solid renders synchronously. Returns the unmount.
 */
export function mountPage(
	node: HTMLElement,
	{ Root }: ISolidSetup,
	Page: Component,
	count: number,
): () => void {
	return render(
		() => (
			<Root>
				{Array.from({ length: count }, () => (
					<Page />
				))}
			</Root>
		),
		node,
	)
}
