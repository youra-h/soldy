import { flushSync, mount, unmount, type Component, type Snippet } from 'svelte'
import Host from './Host.svelte'

/** The library's setup module: the wrapper a page of the library is rendered in, if any. */
export interface ISvelteSetup {
	Root?: Component<{ children: Snippet }>
}

/**
 * `count` copies of a page under one Svelte root wrapped in the library's
 * `Root`, flushed synchronously — as the soldy host does it. Returns the
 * unmount.
 */
export function mountPage(
	node: HTMLElement,
	{ Root }: ISvelteSetup,
	Page: Component,
	count: number,
): () => void {
	const root = mount(Host, { target: node, props: { Root, Page, count } })

	flushSync()

	return () => void unmount(root)
}
