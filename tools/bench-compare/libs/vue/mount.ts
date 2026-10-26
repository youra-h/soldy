import { createApp, h, type App, type Component } from 'vue'

/**
 * The library's setup module: what the application installs (`install` —
 * plugins, themes) and the provider a page of the library is wrapped in
 * (`Root`). Both are optional: a library may need only one of them.
 */
export interface IVueSetup {
	install?: (app: App) => void
	Root?: Component
}

/** Monotonic id prefix: every app of the page gets its own, as in the soldy host. */
let apps = 0

/**
 * `count` copies of a page under one Vue app wrapped in the library's
 * provider, mounted synchronously — as the soldy host does it. Returns the
 * unmount.
 */
export function mountPage(
	node: HTMLElement,
	{ install, Root }: IVueSetup,
	Page: Component,
	count: number,
): () => void {
	const copies = () => Array.from({ length: count }, (_, key) => h(Page, { key }))
	const app = createApp({
		render: () => (Root ? h(Root, null, { default: copies }) : copies()),
	})

	app.config.idPrefix = `bench${++apps}`
	install?.(app)
	app.mount(node)

	return () => app.unmount()
}
