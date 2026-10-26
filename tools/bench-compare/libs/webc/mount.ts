/**
 * The library's setup module: elements registered and styles imported on
 * load; `root` — the wrapper element a page of the library lives in (theme
 * provider, locale provider), when the library needs one.
 */
export interface IWebcSetup {
	root?: () => HTMLElement
}

/** A page file: builds one copy of the page — the nodes an application writes. */
export type TPage = () => Node

/**
 * `count` copies of a page appended to the node — inside the library's root
 * when it has one, as the soldy host does it with `<so-locale-provider>`.
 * Elements upgrade synchronously on insertion. Returns the unmount.
 */
export function mountPage(
	node: HTMLElement,
	{ root }: IWebcSetup,
	Page: TPage,
	count: number,
): () => void {
	const outer = root?.() ?? document.createElement('div')

	for (let index = 0; index < count; index++) outer.appendChild(Page())

	node.appendChild(outer)

	return () => outer.remove()
}
