import { Fragment, type ComponentType, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'

/** The library's setup module: the provider a page of the library is wrapped in. */
export interface IReactSetup {
	Root: ComponentType<{ children?: ReactNode }>
}

/** Monotonic id prefix: every root of the page gets its own, as in the soldy host. */
let roots = 0

/**
 * `count` copies of a page under one React root wrapped in the library's
 * provider, rendered synchronously — as the soldy host does it. Returns the
 * unmount.
 */
export function mountPage(
	node: HTMLElement,
	{ Root }: IReactSetup,
	Page: ComponentType,
	count: number,
): () => void {
	const root = createRoot(node, { identifierPrefix: `bench${++roots}-` })

	flushSync(() =>
		root.render(
			<Root>
				{Array.from({ length: count }, (_, key) => (
					<Fragment key={key}>
						<Page />
					</Fragment>
				))}
			</Root>,
		),
	)

	return () => root.unmount()
}
